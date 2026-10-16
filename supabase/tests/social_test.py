# Sosyal akış SQL testleri (social_feed_upgrade.sql): yeniden paylaş, alıntı, yanıt zinciri, kaydet, arama.
# Kullanım A (gömülü): pip install pgserver && python3 supabase/tests/social_test.py
# Kullanım B (kendi Postgres'in): PGURI=postgresql://postgres@localhost:5432/postgres python3 supabase/tests/social_test.py
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

for name, f in [('bootstrap', 'bootstrap.sql'), ('community', '../community_upgrade.sql'), ('social#1', '../social_feed_upgrade.sql'), ('social#2 (idempotent)', '../social_feed_upgrade.sql')]:
    rc, errs = file(os.path.join(HERE, f))
    print(name, rc, errs)
    assert rc == 0, errs

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

gen = sh("select id from communities where slug='bigova-kampus'")[1]
t('A profile', 'A', "select community_set_profile('İktisat', 2)")
iktisat = sh("select id from communities where slug='iktisat'")[1]

post = val(t('A posts', 'A', f"select community_create_post('{gen}','post',null,'Biga #kahve önerisi: Çarşı Kafe')"))
t('feed has new columns', 'B', f"select reposted, bookmarked, repost_count, quoted_unavailable from community_feed('all',null,null,null,null,15,'{post}')", has='f|f|0|f')

# --- yeniden paylaş
o = t('B reposts', 'B', f"select community_toggle_repost('{post}')", has='"reposted": true')
t('repost_count 1', 'A', f"select repost_count from community_feed('all',null,null,null,null,15,'{post}')", has='1')
t('repost appears as original with reposted_by', 'C', "select id::text || '|' || reposted_by_name from community_feed('all') where reposted_by_id is not null", has=f'{post}|User B')
t('reposted flag for B', 'B', f"select reposted from community_feed('all',null,null,null,null,15,'{post}')", has='t')
t('reposted flag for C false', 'C', f"select reposted from community_feed('all',null,null,null,null,15,'{post}')", has='f')
t('detail lookup ignores repost rows', 'C', f"select count(*) from community_feed('all',null,null,null,null,15,'{post}')", has='1')
t('B undo repost', 'B', f"select community_toggle_repost('{post}')", has='"reposted": false')
t('repost_count back to 0', 'A', f"select repost_count from community_feed('all',null,null,null,null,15,'{post}')", has='0')
t('repost row gone from feed', 'C', "select count(*) from community_feed('all') where reposted_by_id is not null", has='0')
t('repost again after undo', 'B', f"select community_toggle_repost('{post}')", has='"reposted": true')
ikpost = val(t('A posts in dept', 'A', f"select community_create_post('{iktisat}','post',null,'iktisat içi')"))
t('non-member cannot repost dept post (public community)', 'B', f"select community_toggle_repost('{ikpost}')", ok=False, has='topluluğa katılmalısın')

# --- alıntı
q1 = val(t('C quotes', 'C', f"select community_quote_post('{post}', 'Katılıyorum!')"))
t('quote shows quoted fields', 'A', f"select quoted_author_name || '|' || quoted_body from community_feed('all',null,null,null,null,15,'{q1}')", has='User A|Biga #kahve')
t('quote counts as repost', 'A', f"select repost_count from community_feed('all',null,null,null,null,15,'{post}')", has='2')
t('empty quote rejected', 'C', f"select community_quote_post('{post}', '  ')", ok=False, has='yaz')
t('quote of own foreign image rejected', 'C', f"select community_quote_post('{post}', 'x', array['{U['A']}/a.jpg'])", ok=False, has='Geçersiz fotoğraf')
rp = sh(f"select id from community_posts where author_id='{U['B']}' and quoted_post_id='{post}' and deleted_at is null")[1]
t('reposting a repost row resolves to original', 'D', f"select community_toggle_repost('{rp}')", has=f'"id": "{post}"')
t('kind filter excludes reposts', 'A', "select count(*) from community_feed('all',null,'post') where reposted_by_id is not null", has='0')

# --- silme: orijinal silinince
t('A deletes original', 'A', f"select community_delete('post','{post}')")
t('plain reposts vanish', 'C', "select count(*) from community_feed('all') where reposted_by_id is not null", has='0')
t('quote shows unavailable', 'D', f"select quoted_unavailable from community_feed('all',null,null,null,null,15,'{q1}')", has='t')
t('quote body hidden when unavailable', 'D', f"select coalesce(quoted_body,'<null>') from community_feed('all',null,null,null,null,15,'{q1}')", has='<null>')

# --- özel grup sızıntısı
o = t('A creates private group', 'A', "select * from community_create_study('Gizli Grup','Mikro','Pzt',null,5,true)")
slug = o.splitlines()[-1].split('|')[1]
gid = sh(f"select id from communities where slug='{slug}'")[1]
gp = val(t('A posts in private', 'A', f"select community_create_post('{gid}','post',null,'gizli bilgi')"))
t('outsider cannot repost private', 'B', f"select community_toggle_repost('{gp}')", ok=False, has='bulunamadı')
t('outsider cannot quote private', 'B', f"select community_quote_post('{gp}','x')", ok=False, has='bulunamadı')
t('outsider cannot bookmark private', 'B', f"select community_toggle_bookmark('{gp}')", ok=False)
sh(f"insert into community_members(community_id,user_id) values ('{gid}','{U['B']}')")
bq = val(t('B member quotes private', 'B', f"select community_quote_post('{gp}','tamam')"))
sh(f"delete from community_members where community_id='{gid}' and user_id='{U['B']}'")
t('B (left) sees quote as unavailable only if quote itself readable; private community hides it', 'B', f"select count(*) from community_feed('all',null,null,null,null,15,'{bq}')", has='0')

# --- engelleme
p2 = val(t('A posts 2', 'A', f"select community_create_post('{gen}','post',null,'ikinci')"))
sh(f"insert into user_blocks values ('{U['A']}','{U['D']}')")
t('blocked cannot repost', 'D', f"select community_toggle_repost('{p2}')", ok=False)
t('blocked cannot quote', 'D', f"select community_quote_post('{p2}','x')", ok=False)
sh("delete from user_blocks")

# --- kaydet
t('bookmark', 'B', f"select community_toggle_bookmark('{p2}')", has='"bookmarked": true')
t('saved scope lists it', 'B', "select count(*) from community_feed('saved')", has='1')
t('saved is per user', 'C', "select count(*) from community_feed('saved')", has='0')
t('bookmarked flag', 'B', f"select bookmarked from community_feed('all',null,null,null,null,15,'{p2}')", has='t')
t('unbookmark', 'B', f"select community_toggle_bookmark('{p2}')", has='"bookmarked": false')
t('saved empty again', 'B', "select count(*) from community_feed('saved')", has='0')

# --- kullanıcı akışı ve arama
t('user scope needs author', 'B', "select count(*) from community_feed('user')", ok=False, has='Kullanıcı')
t('user scope lists author posts', 'B', f"select count(*) from community_feed('user',null,null,null,null,15,null,'{U['A']}')", has='2')
t('user scope includes reposts', 'B', f"select count(*) from community_feed('user',null,null,null,null,15,null,'{U['B']}') where reposted_by_id is not null", has='0')
c1 = val(t('C posts #Çalışma', 'C', f"select community_create_post('{gen}','post',null,'Bugün #Çalışma günü ŞİMDİ')"))
t('search turkish case-insensitive', 'B', "select count(*) from community_feed('all',null,null,null,null,15,null,null,'şimdi')", has='1')
t('search hashtag', 'B', "select count(*) from community_feed('all',null,null,null,null,15,null,null,'#calisma')", has='1')
t('search % is literal', 'B', "select count(*) from community_feed('all',null,null,null,null,15,null,null,'%')", has='0')
t('search no match', 'B', "select count(*) from community_feed('all',null,null,null,null,15,null,null,'zzzyok')", has='0')

# --- yanıt zinciri
cm = val(t('B comments', 'B', f"select community_add_comment('{p2}','ilk yorum')"))
rep = val(t('C replies to comment', 'C', f"select community_add_comment('{p2}','yanıt', '{cm}')"))
rep2 = val(t('A replies to reply', 'A', f"select community_add_comment('{p2}','yanıtın yanıtı', '{rep}')"))
t('comments expose parent + reply_to_name', 'A', f"select parent_id::text || '|' || reply_to_name from community_comments('{p2}') where id='{rep}'", has=f'{cm}|User B')
t('top-level has null parent', 'A', f"select count(*) from community_comments('{p2}') where parent_id is null", has='1')
t('unknown parent rejected', 'C', f"select community_add_comment('{p2}','x','00000000-0000-0000-0000-0000000000ff')", ok=False, has='bulunamadı')
t('comment_count counts replies', 'A', f"select comment_count from community_feed('all',null,null,null,null,15,'{p2}')", has='3')
t('2-arg add_comment still works', 'B', f"select community_add_comment('{p2}','eski çağrı')")
sh(f"insert into user_blocks values ('{U['B']}','{U['C']}')")
t('blocked cannot reply to blocked', 'C', f"select community_add_comment('{p2}','x','{cm}')", ok=False)
sh("delete from user_blocks")
t('deleted parent: reply remains, reply_to_name null', 'B', f"select community_delete('comment','{cm}')")
t('orphan reply listed without reply_to_name', 'A', f"select coalesce(reply_to_name,'<null>') from community_comments('{p2}') where id='{rep}'", has='<null>')

# --- izinler
t('anon cannot call new rpcs', 'A', f"reset role; set role anon; select community_toggle_bookmark('{p2}')", ok=False)
t('direct bookmarks table denied', 'A', "select * from community_bookmarks", ok=False)
print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
