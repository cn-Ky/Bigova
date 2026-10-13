# Topluluk SQL testleri (80 senaryo): gömülü Postgres + Supabase taklidi (bootstrap.sql) üzerinde çalışır.
# Kullanım: pip install pgserver && python3 supabase/tests/community_test.py
import pgserver, tempfile, sys, subprocess, os
HERE = os.path.dirname(os.path.abspath(__file__))
d = tempfile.mkdtemp()
db = pgserver.get_server(d)
uri = db.get_uri()
psql = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin', 'psql')
def sh(sql, expect_error=False):
    p = subprocess.run([psql, uri, '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-t', '-A', '-c', sql], capture_output=True, text=True)
    return p.returncode, (p.stdout + p.stderr).strip()
def file(path):
    p = subprocess.run([psql, uri, '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-f', path], capture_output=True, text=True)
    return p.returncode, [l for l in p.stderr.splitlines() if 'ERROR' in l or 'FATAL' in l]
print('bootstrap', file(os.path.join(HERE, 'bootstrap.sql')))
print('mig#1', file(os.path.join(HERE, '..', 'community_upgrade.sql')))
print('mig#2', file(os.path.join(HERE, '..', 'community_upgrade.sql')))

U = {k: f'00000000-0000-0000-0000-00000000000{i}' for i, k in enumerate('ABCDE', 1)}
for k, v in U.items():
    rc, o = sh(f"insert into profiles(id,name) values ('{v}','User {k}')"); assert rc == 0, o
passed = failed = 0
def as_(u, sql, admin=False):
    claims = '{"app_metadata":{"role":"admin"}}' if admin else '{}'
    pre = f"set role authenticated; select set_config('request.jwt.claim.sub','{U[u]}',false), set_config('request.jwt.claims','{claims}',false) \\gset\n"
    return sh("set role authenticated; select set_config('request.jwt.claim.sub','%s',false)::text, set_config('request.jwt.claims','%s',false)::text; %s" % (U[u], claims, sql))
def t(name, u, sql, ok=True, has=None, admin=False):
    global passed, failed
    rc, o = as_(u, sql, admin)
    good = (rc == 0) == ok and (has is None or has in o)
    passed += good; failed += (not good)
    print(('PASS' if good else 'FAIL'), name, '' if good else f'\n   rc={rc} out={o[:400]}')
    return o
def val(o): return o.splitlines()[-1]

# auto-join general on new profile
print(sh("select count(*) from community_members m join communities c on c.id=m.community_id where c.slug='bigova-kampus'")[1], "members in general (expect 5)")
t('set_profile ok', 'A', "select community_set_profile('İktisat', 2)")
t('set_profile bad dept', 'B', "select community_set_profile('Yok', 2)", ok=False, has='Bölüm bulunamadı')
t('set_profile bad grade (MYO 4)', 'B', "select community_set_profile('Biga MYO', 4)", ok=False, has='sınıf bulunamadı')
print('A memberships (expect 3):', sh(f"select count(*) from community_members where user_id='{U['A']}'")[1])
t('direct table read denied', 'A', "select * from community_posts", ok=False)
t('direct insert denied', 'A', "insert into community_posts(community_id,author_id,body) select id, auth.uid(), 'x' from communities limit 1", ok=False)

gen = sh("select id from communities where slug='bigova-kampus'")[1]
iktisat = sh("select id from communities where slug='iktisat'")[1]
# posting
o = t('create post', 'A', f"select community_create_post('{gen}','post',null,'Merhaba Biga!')")
post = val(o)
t('non-member cannot post in dept', 'B', f"select community_create_post('{iktisat}','post',null,'selam')", ok=False, has='katılmalısın')
t('empty post rejected', 'A', f"select community_create_post('{gen}','post',null,'  ')", ok=False, has='Boş')
t('question needs title', 'A', f"select community_create_post('{gen}','question','ab','soru')", ok=False, has='başlığı')
o = t('create question', 'A', f"select community_create_post('{gen}','question','Mikro 2. ünite nasıl çalışılır?','Önerisi olan?','Mikroiktisat')")
q = val(o)
t('foreign image path rejected', 'A', f"select community_create_post('{gen}','post',null,'x', null, array['{U['B']}/a.jpg'])", ok=False, has='Geçersiz fotoğraf')
t('own image path ok', 'A', f"select community_create_post('{gen}','post',null,'', null, array['{U['A']}/a.jpg'])")
# feed
t('feed mine sees 3 posts', 'A', "select count(*) from community_feed('mine')", has='3')
t('B sees A posts in all scope', 'B', "select count(*) from community_feed('all')", has='3')
t('dept feed hidden? B reads public dept', 'B', f"select count(*) from community_feed('community','{iktisat}')", has='0')
# comments + likes
o = t('B comments on question', 'B', f"select community_add_comment('{q}', 'Önce konu özetini çıkar.')")
c1 = val(o)
t('comment count 1', 'A', f"select comment_count from community_feed('community','{gen}',null,null,null,15,'{q}')", has='1')
t('like post', 'B', f"select community_toggle_like('post','{post}')", has='"liked": true')
t('unlike post', 'B', f"select community_toggle_like('post','{post}')", has='"liked": false')
t('like comment', 'A', f"select community_toggle_like('comment','{c1}')", has='"count": 1')
t('B cannot accept answer', 'B', f"select community_accept_answer('{q}','{c1}')", ok=False, has='soru sahibi')
t('A accepts answer', 'A', f"select community_accept_answer('{q}','{c1}')", has=c1)
t('solved filter', 'A', "select count(*) from community_feed('all',null,'question','solved')", has='1')
t('open filter', 'A', "select count(*) from community_feed('all',null,'question','open')", has='0')
t('is_accepted flag', 'B', f"select is_accepted from community_comments('{q}')", has='t')
# blocks
sh(f"insert into user_blocks values ('{U['A']}','{U['C']}')")
t('C joins general (already) & cannot see A posts', 'C', "select count(*) from community_feed('all')", has='0')
t('A cannot see C posts either (two-way)', 'C', f"select community_create_post('{gen}','post',null,'C yazdı')")
t('A does not see blocked C post', 'A', "select count(*) from community_feed('all') where author_name='User C'", has='0')
t('C cannot comment on A post', 'C', f"select community_add_comment('{post}','hey')", ok=False)
t('C cannot like A post', 'C', f"select community_toggle_like('post','{post}')", ok=False)
sh(f"delete from user_blocks")
# deleting
imgpost = sh("select id from community_posts where cardinality(images) > 0 limit 1")[1]
t('B cannot delete A post', 'B', f"select community_delete('post','{post}')", ok=False, has='yetkin')
t('A deletes own image post returns paths', 'A', f"select community_delete('post', '{imgpost}')", has=U['A'])
t('deleted post gone from feed', 'A', "select count(*) from community_feed('all')", has='3')
# reports & auto-hide
o = t('D posts', 'D', f"select community_create_post('{gen}','post',null,'şüpheli içerik')")
dp = val(o)
t('self report rejected', 'D', f"select community_report('post','{dp}','spam')", ok=False, has='Kendi')
t('report 1', 'A', f"select community_report('post','{dp}','spam')")
t('report dup is idempotent', 'A', f"select community_report('post','{dp}','spam')")
t('still visible after 1', 'B', f"select count(*) from community_feed('all') where id='{dp}'", has='1')
t('report 2', 'B', f"select community_report('post','{dp}','taciz','not')")
t('report 3', 'C', f"select community_report('post','{dp}','uygunsuz')")
t('hidden from others after 3', 'B', f"select count(*) from community_feed('all') where id='{dp}'", has='0')
t('author still sees hidden', 'D', f"select hidden from community_feed('all') where id='{dp}'", has='t')
t('non-admin cannot list reports', 'A', "select * from community_admin_reports()", ok=False)
t('admin lists reports', 'E', "select report_count from community_admin_reports()", admin=True, has='3')
t('admin dismiss restores', 'E', f"select community_admin_resolve('post','{dp}','dismiss')", admin=True)
t('visible again', 'B', f"select count(*) from community_feed('all') where id='{dp}'", has='1')
t('re-reports do not re-hide after review', 'C', f"select community_report('post','{dp}','spam')")
t('admin removes', 'E', f"select community_admin_resolve('post','{dp}','remove')", admin=True)
t('removed gone', 'B', f"select count(*) from community_feed('all') where id='{dp}'", has='0')
# study groups
o = t('create private study group', 'A', "select * from community_create_study('Mikro Çalışma','Mikroiktisat','Salı 18:00',null,3,true)")
slug, code = o.splitlines()[-1].split('|')[1], o.splitlines()[-1].split('|')[2]
gid = sh(f"select id from communities where slug='{slug}'")[1]
t('private group hidden from B list', 'B', "select count(*) from community_list('study')", has='0')
t('private group get hidden from B', 'B', f"select count(*) from community_get('{slug}')", has='0')
t('join with wrong code', 'B', "select community_join_with_code('ZZZZZZZZ')", ok=False, has='geçersiz')
t('join with code', 'B', f"select community_join_with_code('{code}')", has=slug)
t('code visible only to owner', 'B', f"select join_code from community_get('{slug}')", has='')
o = t('owner sees code', 'A', f"select join_code from community_get('{slug}')", has=code)
t('B sees group now', 'B', "select count(*) from community_list('study')", has='1')
t('C joins via code', 'C', f"select community_join_with_code('{code}')")
t('D blocked by capacity', 'D', f"select community_join_with_code('{code}')", ok=False, has='dolu')
t('owner cannot leave', 'A', f"select community_leave('{gid}')", ok=False, has='sahibi')
t('B leaves', 'B', f"select community_leave('{gid}')")
t('member_count updated', 'A', f"select member_count from community_get('{slug}')", has='2')
t('mod removes member', 'A', f"select community_remove_member('{gid}', '{U['C']}')")
t('member cannot remove', 'B', f"select community_remove_member('{gid}', '{U['A']}')", ok=False)
# forum + channels
gch = val(sh("select id from channels where category='ders' limit 1")[1])
t('global channels listed', 'B', "select count(*) from community_channels()", has='19')
t('B sends', 'B', f"select channel_send('{gch}','selam forum')")
t('empty msg rejected', 'B', f"select channel_send('{gch}','')", ok=False)
t('messages fetched', 'A', f"select count(*) from channel_messages_get('{gch}')", has='1')
t('rls direct read allowed', 'A', f"select count(*) from channel_messages where channel_id='{gch}'", has='1')
sch = sh(f"select k.id from channels k join communities c on c.id=k.community_id where c.slug='{slug}'")[1]
t('non-member cannot read group channel', 'D', f"select count(*) from channel_messages_get('{sch}')", ok=False)
t('non-member rls read empty', 'D', f"select count(*) from channel_messages where channel_id='{sch}'", has='0')
t('non-member cannot send to group', 'D', f"select channel_send('{sch}','hi')", ok=False)
t('owner creates channel', 'A', f"select community_create_channel('{gid}', 'Soru Çözümü')")
t('member cannot create channel', 'D', f"select community_create_channel('{iktisat}', 'x1')", ok=False)
t('rate limit messages', 'B', "select count(*) from (select channel_send('%s','m'||g) from generate_series(1,25) g) s" % gch, ok=False, has='Çok hızlı')
bmsg = sh(f"select id from channel_messages where author_id='{U['B']}' limit 1")[1]
t('author deletes message', 'B', f"select community_delete('message', '{bmsg}')")
t('post rate limit (10/h)', 'A', "select count(*) from (select community_create_post('%s','post',null,'p'||g) from generate_series(1,12) g) s" % gen, ok=False, has='Çok hızlı')
t('delete group by non-owner', 'B', f"select community_delete_group('{gid}')", ok=False)
t('owner deletes group', 'A', f"select community_delete_group('{gid}')")
t('anon cannot call rpc', 'A', "reset role; set role anon; select * from community_list()", ok=False)
print(f"\n{passed} passed, {failed} failed")

sys.exit(1 if failed else 0)
