const root = new URL('../', import.meta.url);
const routes = [['', 'ツール一覧'], ['total-the-cash/', '現金合計'], ['welkatsu/', 'ウェル活'], ['echange/', '両替'], ['unit-price/', '単価比較'], ['weekly-plan-review/', '週間シート']];
const header = document.createElement('header');
header.className = 'site-header';
const inner = document.createElement('div');
inner.className = 'site-header-inner';
const brand = document.createElement('a');
brand.className = 'brand'; brand.href = root.href;
brand.innerHTML = '<span class="brand-mark">k.</span>kzy1225 <small>暮らしの計算室</small>';
const nav = document.createElement('nav'); nav.className='site-nav'; nav.setAttribute('aria-label','ツールナビゲーション');
for (const [path,label] of routes) {
  const link=document.createElement('a'); link.href=new URL(path,root).href; link.textContent=label;
  const here=location.pathname.replace(/index\.html$/, '');
  if(here===new URL(link.href).pathname) link.setAttribute('aria-current','page');
  nav.append(link);
}
inner.append(brand,nav);header.append(inner);document.body.prepend(header);
const footer=document.createElement('footer');footer.className='site-footer';
const back=document.createElement('a');back.href=root.href;back.textContent='← ツール一覧';
const credit=document.createElement('span');credit.textContent='kzy1225.github.io · 暮らしの計算室';
footer.append(back,credit);document.body.append(footer);
