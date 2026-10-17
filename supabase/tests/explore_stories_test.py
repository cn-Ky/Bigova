# Keşfet, arama, öneri ve hikaye SQL testleri (explore_stories_upgrade.sql).
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
for name, f in [('instagram', '../instagram_upgrade.sql'), ('explore_stories#1', '../explore_stories_upgrade.sql'), ('explore_stories#2 (idempotent)', '../explore_stories_upgrade.sql')]:
    rc, errs = file(os.path.join(HERE, f)); print(name, rc, errs); assert rc == 0, errs

U = {k: f'00000000-0000-0000-0000-00000000000{i}' for i, k in enumerate('ABCDE', 1)}
NAMES = {'A': 'Ayşe Yılmaz', 'B': 'Burak Demir', 'C': 'Cem Kaya', 'D': 'Deniz İnan', 'E': 'Elif Şahin'}
for k, v in U.items():
    rc, o = sh(f"insert into profiles(id,name) values ('{v}','{NAMES[k]}')"); assert rc == 0, o
passed = failed = 0
def t(name, u, sql, ok=True, has=None, not_has=None):
    global passed, failed
    rc, o = sh("set role authenticated; select set_config('request.jwt.claim.sub','%s',false)::text, set_config('request.jwt.claims','{}',false)::text; %s" % (U[u], sql))
    good = (rc == 0) == ok and (has is None or has in o) and (not_has is None or not_has not in o)
    passed += good; failed += (not good)
    print(('PASS' if good else 'FAIL'), name, '' if good else f'\n   rc={rc} out={o[:500]}')
    return o
def val(o): return o.splitlines()[-1]

OTHER = sh("select name from communities where kind='department' and name <> 'İktisat' order by name limit 1")[1]
assert OTHER, 'ikinci bir bölüm bulunamadı'
for k, dep in [('A', 'İktisat'), ('B', 'İktisat'), ('C', OTHER)]:
    t(f'{k} profile', k, f"select community_set_profile('{dep}', 2)")
gen = sh("select id from communities where slug='bigova-kampus'")[1]
def post(u, body, img=True):
    arr = f"array['{U[u]}/{abs(hash(body)) % 10**8}.jpg']" if img else "'{}'"
    return val(t(f'{u} posts: {body[:18]}', u, f"select community_create_post('{gen}','post',null,'{body}',null, {arr})"))

# --- keşfet
pA = post('A', 'ayşenin fotoğrafı')
pB1 = post('B', 'burak bir')
pB2 = post('B', 'burak iki')
pBtext = post('B', 'sadece yazı', img=False)
t('C likes pB1', 'C', f"select community_toggle_like('post','{pB1}')")
t('D likes pB1', 'D', f"select community_toggle_like('post','{pB1}')")
t('explore returns photo posts only, most engaging first', 'C', "select 'E=' || string_agg(id::text, ',' order by ord) from (select id, row_number() over () as ord from community_explore()) x", has=f'E={pB1},')
t('explore excludes text-only posts', 'C', f"select 'N=' || count(*) from community_explore() where id = '{pBtext}'", has='N=0')
t('explore excludes own posts', 'A', f"select 'N=' || count(*) from community_explore() where id = '{pA}'", has='N=0')
t('explore row shape', 'C', f"select 'S=' || image_count || '/' || like_count || '/' || comment_count from community_explore() where id = '{pB1}'", has='S=1/2/0')
t('explore pagination (limit 1, offset 1)', 'C', "select 'N=' || count(*) from community_explore(1, 1)", has='N=1')
t('explore limit is capped', 'C', "select 'N=' || count(*) from community_explore(1000, 0)", has='N=3')
sh(f"update community_posts set hidden = true where id = '{pB2}'")
t('hidden post leaves explore', 'C', f"select 'N=' || count(*) from community_explore() where id = '{pB2}'", has='N=0')
sh(f"update community_posts set hidden = false where id = '{pB2}'")
sh(f"insert into user_blocks values ('{U['C']}','{U['A']}')")
t('blocked author leaves explore', 'C', f"select 'N=' || count(*) from community_explore() where id = '{pA}'", has='N=0')
sh("delete from user_blocks")
sh(f"update profiles set privacy='friends' where id='{U['B']}'")
t('private-profile author leaves explore for strangers', 'C', "select 'N=' || count(*) from community_explore()", has='N=1')
sh(f"update profiles set privacy='everyone' where id='{U['B']}'")
t('deleted post leaves explore', 'B', f"select community_delete('post','{pB2}')")
t('deleted not in explore', 'C', f"select 'N=' || count(*) from community_explore() where id = '{pB2}'", has='N=0')
t('anon cannot explore', 'C', "reset role; set role anon; select * from community_explore()", ok=False)

# --- gündem etiketleri
post('A', '#biga #Biga güzel bir gün', img=False)
post('C', 'Kampüs #biga #kampüs', img=False)
post('D', 'yine #kampüs', img=False)
t('trending: distinct posts per tag, case-insensitive', 'E', "select 'T=' || string_agg(tag || ':' || uses, ',' order by uses desc, tag) from community_trending_tags()", has='T=#biga:2,#kampüs:2')
hidden = val(t('hidden tag post', 'D', f"select community_create_post('{gen}','post',null,'#gizli etiket',null,'{{}}')"))
sh(f"update community_posts set hidden = true where id = '{hidden}'")
t('hidden posts do not trend', 'E', "select 'N=' || count(*) from community_trending_tags() where tag = '#gizli'", has='N=0')
t('trending limit', 'E', "select 'N=' || count(*) from community_trending_tags(1)", has='N=1')

# --- kişi arama
t('search: first-name prefix', 'C', "select 'R=' || string_agg(name, ',') from community_search_people('ay')", has='R=Ayşe Yılmaz')
t('search: Turkish letters do not matter', 'C', "select 'R=' || string_agg(name, ',') from community_search_people('AYSE')", has='R=Ayşe Yılmaz')
t('search: surname prefix', 'C', "select 'R=' || string_agg(name, ',') from community_search_people('yilm')", has='R=Ayşe Yılmaz')
t('search: dotted capital İ', 'C', "select 'R=' || string_agg(name, ',') from community_search_people('inan')", has='R=Deniz İnan')
t('search excludes myself', 'A', "select 'N=' || count(*) from community_search_people('ayse')", has='N=0')
t('search: empty query returns nothing', 'A', "select 'N=' || count(*) from community_search_people('   ')", has='N=0')
t('search: LIKE wildcards are escaped', 'A', "select 'N=' || count(*) from community_search_people('%')", has='N=0')
sh(f"insert into user_blocks values ('{U['C']}','{U['A']}')")
t('search hides blocked people', 'C', "select 'N=' || count(*) from community_search_people('ay')", has='N=0')
sh("delete from user_blocks")
t('C follows A', 'C', f"select community_follow('{U['A']}')")
t('search shows relation', 'C', "select 'R=' || relation || '/' || coalesce(department, '-') from community_search_people('ay')", has='R=following/İktisat')

# --- öneriler
t('suggest: same department ranks first with reason', 'A', "select 'R=' || name || '/' || reason from community_suggested_people() limit 1", has='R=Burak Demir/department')
t('suggest: already followed are excluded', 'C', f"select 'N=' || count(*) from community_suggested_people() where user_id = '{U['A']}'", has='N=0')
t('C follows D, so A gets mutual suggestion', 'C', f"select community_follow('{U['D']}')")
t('A follows C', 'A', f"select community_follow('{U['C']}')")
t('suggest: mutual reason', 'A', f"select 'R=' || reason || '/' || mutual from community_suggested_people() where user_id = '{U['D']}'", has='R=mutual/1')
sh(f"update profiles set privacy='friends' where id='{U['E']}'")
t('suggest: private profiles are not suggested', 'A', f"select 'N=' || count(*) from community_suggested_people() where user_id = '{U['E']}'", has='N=0')
sh(f"insert into user_blocks values ('{U['A']}','{U['B']}')")
t('suggest: blocked are not suggested', 'A', f"select 'N=' || count(*) from community_suggested_people() where user_id = '{U['B']}'", has='N=0')
sh("delete from user_blocks")
t('suggest: never suggests myself', 'A', f"select 'N=' || count(*) from community_suggested_people() where user_id = '{U['A']}'", has='N=0')
sh(f"update profiles set privacy='everyone' where id='{U['E']}'")

# --- hikayeler
t('story: foreign folder rejected', 'A', f"select community_story_create('{U['B']}/x.jpg', 'x')", ok=False, has='Geçersiz')
t('story: bad path rejected', 'A', "select community_story_create('../x.jpg', 'x')", ok=False)
s1 = val(t('A creates story', 'A', f"select community_story_create('{U['A']}/s1.jpg', 'merhaba')"))
s2 = val(t('A creates 2nd story', 'A', f"select community_story_create('{U['A']}/s2.jpg')"))
t('B follows A', 'B', f"select community_follow('{U['A']}')")
t('follower tray shows A with 2 unseen', 'B', f"select 'T=' || story_count || '/' || unseen_count || '/' || is_self from community_stories_tray() where user_id = '{U['A']}'", has='T=2/2/false')
t('stranger tray does not show A', 'E', f"select 'N=' || count(*) from community_stories_tray() where user_id = '{U['A']}'", has='N=0')
t('owner tray lists self first', 'A', "select 'F=' || is_self from community_stories_tray() limit 1", has='F=true')
t('follower sees stories oldest first', 'B', f"select 'S=' || string_agg(caption, ',' order by created_at) from community_stories_of('{U['A']}')", has='S=merhaba,')
t('stranger sees nothing', 'E', f"select 'N=' || count(*) from community_stories_of('{U['A']}')", has='N=0')
sh(f"insert into friendships values ('{U['A']}','{U['E']}','accepted')")
t('friend sees stories without following', 'E', f"select 'N=' || count(*) from community_stories_of('{U['A']}')", has='N=2')
t('viewer marks seen', 'B', f"select 'R=' || community_story_view('{s1}')", has='R=true')
t('view is idempotent', 'B', f"select 'R=' || community_story_view('{s1}')", has='R=true')
t('unseen count drops', 'B', f"select 'T=' || unseen_count from community_stories_tray() where user_id = '{U['A']}'", has='T=1')
t('seen flag is per viewer', 'B', f"select 'S=' || seen from community_stories_of('{U['A']}') where id = '{s1}'", has='S=true')
t('own view is not counted', 'A', f"select 'R=' || community_story_view('{s1}')", has='R=false')
t('stranger view is refused', 'D', f"select 'R=' || community_story_view('{s1}')", has='R=false')
t('owner sees view_count', 'A', f"select 'V=' || view_count from community_stories_of('{U['A']}') where id = '{s1}'", has='V=1')
t('non-owner never sees view_count', 'B', f"select 'V=' || view_count from community_stories_of('{U['A']}') where id = '{s1}'", has='V=0')
t('owner sees viewers', 'A', f"select 'W=' || string_agg(name, ',') from community_story_viewers('{s1}')", has='W=Burak Demir')
t('non-owner gets no viewers', 'B', f"select 'N=' || count(*) from community_story_viewers('{s1}')", has='N=0')
sh(f"insert into user_blocks values ('{U['A']}','{U['B']}')")
t('blocked follower loses tray entry', 'B', f"select 'N=' || count(*) from community_stories_tray() where user_id = '{U['A']}'", has='N=0')
t('blocked follower cannot open stories', 'B', f"select 'N=' || count(*) from community_stories_of('{U['A']}')", has='N=0')
t('blocked viewers are hidden from owner list', 'A', f"select 'N=' || count(*) from community_story_viewers('{s1}')", has='N=0')
sh("delete from user_blocks")
t('non-owner cannot delete', 'B', f"select 'D=' || coalesce(community_story_delete('{s2}'), 'none')", has='D=none')
t('story still exists', 'A', f"select 'N=' || count(*) from community_stories_of('{U['A']}')", has='N=2')
t('owner deletes and gets the path', 'A', f"select 'D=' || community_story_delete('{s2}')", has=f"D={U['A']}/s2.jpg")
for i in range(19):
    sh(f"insert into community_stories(author_id, image) values ('{U['A']}', '{U['A']}/bulk{i}.jpg')")
t('21st active story refused', 'A', f"select community_story_create('{U['A']}/over.jpg')", ok=False, has='20')
# süre dolumu
sh(f"update community_stories set expires_at = now() - interval '1 minute' where author_id = '{U['A']}'")
t('expired stories vanish from tray', 'B', f"select 'N=' || count(*) from community_stories_tray() where user_id = '{U['A']}'", has='N=0')
t('expired stories vanish from viewer', 'B', f"select 'N=' || count(*) from community_stories_of('{U['A']}')", has='N=0')
t('others collect nothing', 'B', "select 'N=' || cardinality(community_story_collect_expired())", has='N=0')
t('owner collects expired paths', 'A', "select 'N=' || cardinality(community_story_collect_expired())", has='N=20')
t('nothing left to collect', 'A', "select 'N=' || cardinality(community_story_collect_expired())", has='N=0')
t('anon cannot create story', 'A', f"reset role; set role anon; select community_story_create('{U['A']}/z.jpg')", ok=False)
t('direct stories table denied', 'A', "select * from community_stories", ok=False)
t('direct views table denied', 'A', "select * from community_story_views", ok=False)
t('private.can_see_story not callable by clients', 'A', f"select private.can_see_story('{U['B']}')", ok=False)
print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
