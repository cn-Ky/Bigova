# Instagram altyapısı SQL testleri (instagram_upgrade.sql): takip, gizli profil isteği, takip akışı, bildirimler.
# Kullanım A (gömülü): pip install pgserver && python3 supabase/tests/instagram_test.py
# Kullanım B (kendi Postgres'in): PGURI=postgresql://postgres@localhost:5432/postgres python3 supabase/tests/instagram_test.py
#   (B için boş bir veritabanı kullan: bootstrap.sql roller ve şemalar oluşturur.)
import os, subprocess, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__))
uri = os.environ.get('PGURI')
if uri:
    psql = 'psql'
else:
    import pgserver
    db = pgserver.get_server(tempfile.mkdtemp())
    uri = db.get_uri()
    psql = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin', 'psql')

def sh(sql):
    p = subprocess.run([psql, uri, '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-t', '-A', '-c', sql], capture_output=True, text=True)
    return p.returncode, (p.stdout + p.stderr).strip()
def file(path):
    p = subprocess.run([psql, uri, '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-f', path], capture_output=True, text=True)
    return p.returncode, [l for l in p.stderr.splitlines() if 'ERROR' in l or 'FATAL' in l]

# bootstrap.sql arkadaşlık tablosunu içermez; gerçek şemadaki private.are_friends'in yerine geçen taslak.
STUB = """
create table public.friendships (requester uuid, addressee uuid, status text);
create function private.are_friends(a uuid, b uuid) returns boolean language sql security definer stable as $$
  select exists (select 1 from public.friendships where status='accepted'
    and ((requester=a and addressee=b) or (requester=b and addressee=a))) $$;
"""
for name, f in [('bootstrap', 'bootstrap.sql'), ('community', '../community_upgrade.sql'), ('social', '../social_feed_upgrade.sql')]:
    rc, errs = file(os.path.join(HERE, f)); print(name, rc, errs); assert rc == 0, errs
rc, o = sh(STUB); assert rc == 0, o
for name, f in [('instagram#1', '../instagram_upgrade.sql'), ('instagram#2 (idempotent)', '../instagram_upgrade.sql')]:
    rc, errs = file(os.path.join(HERE, f)); print(name, rc, errs); assert rc == 0, errs

U = {k: f'00000000-0000-0000-0000-00000000000{i}' for i, k in enumerate('ABCDE', 1)}
for k, v in U.items():
    rc, o = sh(f"insert into profiles(id,name) values ('{v}','User {k}')"); assert rc == 0, o
passed = failed = 0
def t(name, u, sql, ok=True, has=None, not_has=None):
    global passed, failed
    rc, o = sh("set role authenticated; select set_config('request.jwt.claim.sub','%s',false)::text, set_config('request.jwt.claims','{}',false)::text; %s" % (U[u], sql))
    good = (rc == 0) == ok and (has is None or has in o) and (not_has is None or not_has not in o)
    passed += good; failed += (not good)
    print(('PASS' if good else 'FAIL'), name, '' if good else f'\n   rc={rc} out={o[:500]}')
    return o
def val(o): return o.splitlines()[-1]
def unread(u): return val(t(f'{u} unread', u, "select 'n=' || community_notifications_unread_count()"))
def types(u): return val(t(f'{u} types', u, "select 'T=' || coalesce(string_agg(type, ',' order by type), '') from community_notifications_list()"))

gen = sh("select id from communities where slug='bigova-kampus'")[1]
post = val(t('A posts', 'A', f"select community_create_post('{gen}','post',null,'Biga kahve önerisi')"))
cpost = val(t('C posts', 'C', f"select community_create_post('{gen}','post',null,'C gönderisi')"))
photo = val(t('A posts photo', 'A', f"select community_create_post('{gen}','post',null,'fotoğraflı',null, array['{U['A']}/a.jpg'])"))

# --- takip
t('self follow rejected', 'B', f"select community_follow('{U['B']}')", ok=False, has='Kendini')
t('unknown user rejected', 'B', "select community_follow('00000000-0000-0000-0000-0000000000ff')", ok=False, has='bulunamadı')
t('B follows A (public profile) → accepted', 'B', f"select 'S=' || community_follow('{U['A']}')", has='S=accepted')
t('follow is idempotent', 'B', f"select 'S=' || community_follow('{U['A']}')", has='S=accepted')
t('A stats: 1 follower, 2 posts, self', 'A', f"select 'X=' || followers || '/' || following || '/' || posts || '/' || relation from community_follow_stats('{U['A']}')", has='X=1/0/2/self')
t('B stats on A: following, not locked', 'B', f"select 'X=' || relation || '/' || follows_me || '/' || locked from community_follow_stats('{U['A']}')", has='X=following/false/false')
t('A sees B in followers', 'C', f"select 'N=' || count(*) from community_follow_list('{U['A']}', false) where name = 'User B'", has='N=1')
t('B following list has A', 'C', f"select 'N=' || count(*) from community_follow_list('{U['B']}', true) where name = 'User A'", has='N=1')
t('relation in list is relative to viewer', 'B', f"select 'R=' || relation from community_follow_list('{U['B']}', true) where name = 'User A'", has='R=following')

# --- takip akışı ve fotoğraf süzgeci
t('following feed has A, not C', 'B', "select 'A=' || count(*) filter (where body like 'Biga%') || ',C=' || count(*) filter (where body like 'C g%') from community_feed('following')", has='A=1,C=0')
t('following feed includes own posts', 'C', "select 'C=' || count(*) from community_feed('following')", has='C=1')
t('media filter only returns photo posts', 'B', "select 'M=' || count(*) || ',' || bool_and(cardinality(images) > 0) from community_feed('all', null, null, null, null, 15, null, null, null, true)", has='M=1,true')
t('old 9-arg calls still work', 'B', "select 'N=' || count(*) from community_feed('all')", has='N=3')
t('invalid scope rejected', 'B', "select count(*) from community_feed('nope')", ok=False, has='Geçersiz')

# --- gizli profil: istek / onay
sh(f"update profiles set privacy='friends' where id='{U['D']}'")
t('B follows private D → pending', 'B', f"select 'S=' || community_follow('{U['D']}')", has='S=pending')
t('pending is not counted as follower', 'C', f"select 'X=' || followers || '/' || locked from community_follow_stats('{U['D']}')", has='X=0/true')
t('D sees request', 'D', "select 'N=' || count(*) from community_follow_requests() where name = 'User B'", has='N=1')
t('D has follow_request notification', 'D', "select 'T=' || type || '/' || follow_state from community_notifications_list()", has='T=follow_request/incoming')
t('B cannot accept own request', 'B', f"select 'R=' || community_follow_respond('{U['D']}', true)", has='R=false')
t('D accepts', 'D', f"select 'R=' || community_follow_respond('{U['B']}', true)", has='R=true')
t('B now following D', 'B', f"select 'X=' || relation from community_follow_stats('{U['D']}')", has='X=following')
t('follow_request replaced by follow', 'D', "select 'T=' || string_agg(type, ',' order by type) from community_notifications_list()", has='T=follow')
t('B got follow_accept', 'B', "select 'T=' || type from community_notifications_list() where type = 'follow_accept'", has='T=follow_accept')
sh(f"insert into friendships values ('{U['D']}','{U['E']}','accepted')")
t('friend follows private D → accepted at once', 'E', f"select 'S=' || community_follow('{U['D']}')", has='S=accepted')
t('C pending then cancels → request notification removed', 'C', f"select community_follow('{U['D']}'); select community_unfollow('{U['D']}')")
t('no leftover request from C', 'D', "select 'N=' || count(*) from community_notifications_list() where actor_name = 'User C' and type = 'follow_request'", has='N=0')
t('D rejects request', 'A', f"select community_follow('{U['D']}')")
t('D declines A', 'D', f"select 'R=' || community_follow_respond('{U['A']}', false)", has='R=true')
t('A back to none', 'A', f"select 'X=' || relation from community_follow_stats('{U['D']}')", has='X=none')
t('locked list is empty for strangers', 'C', f"select 'N=' || count(*) from community_follow_list('{U['D']}', false)", has='N=0')
t('follower list visible to friend', 'E', f"select 'N=' || count(*) from community_follow_list('{U['D']}', false)", has='N=2')

# --- engelleme
sh(f"insert into user_blocks values ('{U['A']}','{U['C']}')")
t('blocked C cannot follow A', 'C', f"select community_follow('{U['A']}')", ok=False, has='takip edilemiyor')
t('A cannot follow blocked C', 'A', f"select community_follow('{U['C']}')", ok=False)
sh("delete from user_blocks")

# --- takibi bırak / takipçi çıkar
t('B unfollows A', 'B', f"select 'R=' || community_unfollow('{U['A']}')", has='R=true')
t('unfollow again is no-op', 'B', f"select 'R=' || community_unfollow('{U['A']}')", has='R=false')
t('B refollows A', 'B', f"select community_follow('{U['A']}')")
t('A removes follower B', 'A', f"select 'R=' || community_remove_follower('{U['B']}')", has='R=true')
t('B no longer follows A', 'B', f"select 'X=' || relation from community_follow_stats('{U['A']}')", has='X=none')

# --- bildirimler
sh("delete from community_notifications")
t('B likes A post', 'B', f"select community_toggle_like('post','{post}')")
t('A has 1 like notification', 'A', "select 'N=' || count(*) from community_notifications_list() where type = 'like' and actor_name = 'User B'", has='N=1')
t('unread count is 1', 'A', "select 'n=' || community_notifications_unread_count()", has='n=1')
t('B unlike + relike does not duplicate', 'B', f"select community_toggle_like('post','{post}'); select community_toggle_like('post','{post}')")
t('still 1 like notification', 'A', "select 'N=' || count(*) from community_notifications_list() where type = 'like'", has='N=1')
t('self like creates nothing', 'A', f"select community_toggle_like('post','{post}')")
t('no self notification', 'A', "select 'N=' || count(*) from community_notifications_list() where actor_name = 'User A'", has='N=0')
cm = val(t('B comments on A post', 'B', f"select community_add_comment('{post}','ilk yorum')"))
t('A gets comment notification with snippet', 'A', "select 'S=' || snippet from community_notifications_list() where type = 'comment'", has='S=ilk yorum')
t('C replies to B comment', 'C', f"select community_add_comment('{post}','yanıt','{cm}')")
t('B gets reply notification', 'B', "select 'T=' || type || '/' || snippet from community_notifications_list() where type = 'reply'", has='T=reply/yanıt')
t('A also gets comment for the reply', 'A', "select 'N=' || count(*) from community_notifications_list() where type = 'comment'", has='N=2')
t('C reposts A post', 'C', f"select community_toggle_repost('{post}')")
t('C quotes A post', 'C', f"select community_quote_post('{post}','Katılıyorum')")
t('A has repost + quote', 'A', "select 'T=' || string_agg(type, ',' order by type) from community_notifications_list() where type in ('repost','quote')", has='T=quote,repost')
t('repost undo + redo does not duplicate', 'C', f"select community_toggle_repost('{post}'); select community_toggle_repost('{post}')")
t('still 1 repost notification', 'A', "select 'N=' || count(*) from community_notifications_list() where type = 'repost'", has='N=1')
t('photo post notification has image', 'B', f"select community_toggle_like('post','{photo}')")
t('image path returned', 'A', f"select 'I=' || image from community_notifications_list() where post_id = '{photo}'", has=f"I={U['A']}/a.jpg")
t('others cannot read A notifications', 'D', "select 'N=' || count(*) from community_notifications_list() where actor_name = 'User B'", has='N=0')

before = unread('A')
t('mark read', 'A', "select 'R=' || community_notifications_mark_read()", has='R=')
t('unread now 0', 'A', "select 'n=' || community_notifications_unread_count()", has='n=0')
t('list entries flagged read', 'A', "select 'N=' || count(*) from community_notifications_list() where not is_read", has='N=0')
t('new activity is unread again', 'C', f"select community_toggle_like('post','{photo}')")
t('unread is 1', 'A', "select 'n=' || community_notifications_unread_count()", has='n=1')

# --- erişim kısıtları
t('deleted post hides its notifications', 'A', f"select community_delete('post','{photo}')")
t('no notification for deleted post', 'A', f"select 'N=' || count(*) from community_notifications_list() where post_id = '{photo}'", has='N=0')
sh(f"insert into user_blocks values ('{U['A']}','{U['B']}')")
t('blocked actor notifications hidden', 'A', "select 'N=' || count(*) from community_notifications_list() where actor_name = 'User B'", has='N=0')
post2 = val(t('A posts again', 'A', f"select community_create_post('{gen}','post',null,'engel testi')"))
sh(f"insert into community_post_likes(post_id,user_id) values ('{post2}','{U['B']}')")  # işlevi atlayan doğrudan ekleme: yalnızca tetikleyicinin engel kuralı sınanır
t('no notification is created between blocked users', 'A', f"select 'N=' || count(*) from community_notifications where post_id = '{post2}'", ok=False)
rc, o = sh(f"select 'N=' || count(*) from community_notifications where post_id = '{post2}'")
good = rc == 0 and 'N=0' in o; passed += good; failed += (not good); print('PASS' if good else 'FAIL', 'blocked pair produces no notification row', '' if good else o)
sh("delete from user_blocks")
t('anon cannot call follow', 'A', f"reset role; set role anon; select community_follow('{U['B']}')", ok=False)
t('anon cannot read notifications', 'A', "reset role; set role anon; select * from community_notifications_list()", ok=False)
t('direct follows table denied', 'A', "select * from community_follows", ok=False)
t('direct notifications table denied', 'A', "select * from community_notifications", ok=False)
t('private.notify not callable by clients', 'A', f"select private.notify('{U['B']}','{U['A']}','like')", ok=False)
t('private.my_notifications not callable by clients', 'A', "select * from private.my_notifications()", ok=False)
# --- profil ızgarası: user + media kapsamı (istemci yeniden paylaşım satırlarını feed_id <> id ile ayıklar)
photo3 = val(t('A posts a photo for grid', 'A', f"select community_create_post('{gen}','post',null,'ızgara',null, array['{U['A']}/g.jpg'])"))
t('A grid: own photo rows only, none are repost rows', 'B', f"select 'G=' || count(*) || ',' || bool_and(feed_id = id) from community_feed('user', null, null, null, null, 15, null, '{U['A']}', null, true)", has='G=1,true')
t('C reposts the photo', 'C', f"select community_toggle_repost('{photo3}')")
t('C grid query returns the repost row, flagged by feed_id <> id', 'B', f"select 'R=' || count(*) filter (where feed_id <> id) from community_feed('user', null, null, null, null, 15, null, '{U['C']}', null, true)", has='R=1')
t('text-only posts excluded from media grid', 'B', f"select 'T=' || count(*) filter (where cardinality(images) = 0) from community_feed('user', null, null, null, null, 15, null, '{U['A']}', null, true)", has='T=0')
print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
