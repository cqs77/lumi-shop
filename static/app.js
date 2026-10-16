const API='';const state={products:[],cats:[],cat:'common',cart:{}};const $=s=>document.querySelector(s);
const fmtUsd=n=>'$'+Number(n||0).toFixed(2);
function catName(id){const c=state.cats.find(x=>x.id===id);return c?(c.name||c.id):(id||'')}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function loadCats(){try{state.cats=await(await fetch(API+'/api/categories')).json()}catch(e){state.cats=[]}
if(state.cats.length&&!state.cats.find(c=>c.id===state.cat))state.cat=state.cats[0].id}
async function loadProducts(){try{state.products=await(await fetch(API+'/api/products')).json()}catch(e){state.products=[]}renderCats();renderProducts();updateCartUI()}
function renderCats(){const w=$('#cat-tabs');if(!w)return;
if(!state.cats.length){w.innerHTML='';return}
w.innerHTML=state.cats.map(c=>{const n=state.products.filter(p=>(p.category||'')===c.id).length;
return `<button class="cat-tab ${state.cat===c.id?'active':''}" data-cat="${c.id}">${escapeHtml(c.name||c.id)}<span class="cat-count">${n}</span></button>`}).join('');
w.querySelectorAll('[data-cat]').forEach(b=>b.addEventListener('click',()=>{state.cat=b.dataset.cat;renderCats();renderProducts()}))}
function renderProducts(){const g=$('#product-grid');const cat=state.cats.find(c=>c.id===state.cat);
const list=state.products.filter(p=>(p.category||'')===state.cat);const head=$('#cat-head');
if(head)head.innerHTML=cat?`<div class="cat-title">${escapeHtml(cat.name||cat.id)}</div><div class="cat-sub">${escapeHtml(cat.desc||'')}</div>`:'';
if(!list.length){g.innerHTML='<p class="loading">该分类下暂无商品。</p>';return}
g.innerHTML=list.map(p=>`<article class="card"><span class="card-badge ${p.category||''}">${escapeHtml(catName(p.category))}</span><div class="card-img" data-detail="${p.id}"><img src="${p.image||'/static/img/p1.jpg'}" alt="${escapeHtml(p.name)}" loading="lazy"></div><div class="card-body"><h3 data-detail="${p.id}">${escapeHtml(p.name)}</h3><p>${escapeHtml(p.desc||'')}</p><div class="price">${fmtUsd(p.price_usd)}</div><div class="card-actions"><button class="btn btn-ghost" data-detail="${p.id}" style="flex:1">查看详情</button><button class="btn btn-primary" data-add="${p.id}" style="flex:1">加入购物车</button></div></div></article>`).join('');
g.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();addToCart(b.dataset.add)}));
g.querySelectorAll('[data-detail]').forEach(b=>b.addEventListener('click',()=>showDetail(b.dataset.detail)))}
function showDetail(id){const p=state.products.find(x=>x.id===id);if(!p)return;
openModal(`${p.category?`<span class="detail-cat ${p.category}">${escapeHtml(catName(p.category))}</span>`:''}<img class="detail-img" src="${p.image||'/static/img/p1.jpg'}" alt=""><h3 style="font-size:24px;color:#fff">${escapeHtml(p.name)}</h3><div class="detail-price">${fmtUsd(p.price_usd)}</div><p class="detail-desc">${escapeHtml(p.desc||'')}</p><div class="detail-detail">${escapeHtml(p.detail||'暂无更多详情。')}</div><button class="btn btn-primary btn-block" style="margin-top:20px" id="detail-add">加入购物车</button>`,'商品详情');
$('#detail-add').addEventListener('click',()=>{addToCart(p.id);closeModal()})}
function addToCart(id){state.cart[id]=(state.cart[id]||0)+1;updateCartUI();openDrawer()}
function changeQty(id,d){if(!state.cart[id])return;state.cart[id]+=d;if(state.cart[id]<=0)delete state.cart[id];updateCartUI()}
function cartTotal(){let t=0;for(const[id,q]of Object.entries(state.cart)){const p=state.products.find(x=>x.id===id);if(p)t+=p.price_usd*q}return t}
function updateCartUI(){const w=$('#cart-items');const en=Object.entries(state.cart);
if(!en.length){w.innerHTML='<p class="cart-empty">购物车是空的。</p>'}else{
w.innerHTML=en.map(([id,q])=>{const p=state.products.find(x=>x.id===id);if(!p)return'';
return `<div class="cart-row"><img src="${p.image||'/static/img/p1.jpg'}" alt=""><div class="info"><h4>${escapeHtml(p.name)}</h4><span>${fmtUsd(p.price_usd)} × ${q} = ${fmtUsd(p.price_usd*q)}</span></div><div class="qty"><button data-q="${id}" data-d="-1">−</button><span>${q}</span><button data-q="${id}" data-d="1">+</button></div></div>`}).join('');
w.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>changeQty(b.dataset.q,parseInt(b.dataset.d,10))))}
$('#cart-total').textContent=fmtUsd(cartTotal());$('#checkout-btn').disabled=!en.length;
const fab=document.getElementById('cart-fab');const c=en.reduce((a,[,q])=>a+q,0);
if(fab){document.getElementById('fab-count').textContent=c;fab.style.display=c>0?'flex':'none'}}
function openDrawer(){$('#cart-drawer').classList.add('open');$('#drawer-mask').classList.add('open')}
function closeDrawer(){$('#cart-drawer').classList.remove('open');$('#drawer-mask').classList.remove('open')}
function openModal(h,t){$('#modal-title').textContent=t||'';$('#modal-body').innerHTML=h;$('#modal-mask').classList.add('open')}
function closeModal(){$('#modal-mask').classList.remove('open')}
function showCheckout(){if(!Object.keys(state.cart).length)return;
const sh=Object.entries(state.cart).map(([id,q])=>{const p=state.products.find(x=>x.id===id);return p?`<div class="sum-line"><span>${escapeHtml(p.name)} × ${q}</span><strong>${fmtUsd(p.price_usd*q)}</strong></div>`:''}).join('');
openModal(`<div class="order-summary">${sh}<div class="sum-line total"><span>合计</span><strong>${fmtUsd(cartTotal())}</strong></div></div><p style="font-size:13.5px;color:var(--muted);margin-bottom:14px">请填写收货信息，提交后我们会与您联系确认。</p><div class="field"><label>收货人姓名 <span class="req">*</span></label><input id="s-name" placeholder="请输入姓名"></div><div class="form-grid2"><div class="field"><label>联系电话 <span class="req">*</span></label><input id="s-phone" placeholder="含国家区号"></div><div class="field"><label>电子邮箱</label><input id="s-email" placeholder="选填"></div></div><div class="form-grid2"><div class="field"><label>国家/地区 <span class="req">*</span></label><input id="s-country" placeholder="如：中国"></div><div class="field"><label>省/州</label><input id="s-province" placeholder="选填"></div></div><div class="form-grid2"><div class="field"><label>城市</label><input id="s-city" placeholder="选填"></div><div class="field"><label>邮编</label><input id="s-zipcode" placeholder="选填"></div></div><div class="field"><label>详细地址（门牌号） <span class="req">*</span></label><input id="s-address" placeholder="街道 + 门牌号"></div><div class="field"><label>备注</label><textarea id="s-note" placeholder="选填"></textarea></div><button class="btn btn-primary btn-block" id="submit-order">提交订单</button><p class="note">本商城不涉及在线支付。提交后我们将通过您留下的联系方式与您确认订单详情。</p>`,'填写收货信息');
$('#submit-order').addEventListener('click',submitOrder)}
async function submitOrder(){const shipping={name:$('#s-name').value.trim(),phone:$('#s-phone').value.trim(),email:$('#s-email').value.trim(),country:$('#s-country').value.trim(),province:$('#s-province').value.trim(),city:$('#s-city').value.trim(),zipcode:$('#s-zipcode').value.trim(),address:$('#s-address').value.trim(),note:$('#s-note').value.trim()};
if(!shipping.name||!shipping.phone||!shipping.country||!shipping.address){alert('请填写所有带 * 的必填项');return}
const items=Object.entries(state.cart).map(([id,qty])=>({id,qty}));const btn=$('#submit-order');btn.disabled=true;btn.textContent='提交中…';
try{const r=await fetch(API+'/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,shipping})});const d=await r.json();
if(d.ok){state.cart={};updateCartUI();closeDrawer();
openModal(`<div class="ok-box"><div class="ok-icon"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 12.5l5.5 5.5L20 7"/></svg></div><h3>订单提交成功</h3><p>我们已收到您的订单，将尽快与您联系确认。</p><div class="order-no">订单号：${d.order_no}</div></div><button class="btn btn-primary btn-block" style="margin-top:22px" id="done-btn">好的</button>`,'提交成功');
$('#done-btn').addEventListener('click',closeModal)}else{alert('提交失败：'+(d.error||'未知错误'));btn.disabled=false;btn.textContent='提交订单'}}catch(e){alert('网络错误，请重试');btn.disabled=false;btn.textContent='提交订单'}}
document.addEventListener('DOMContentLoaded',async()=>{await loadCats();await loadProducts();renderCats();renderProducts();
$('#cart-close').addEventListener('click',closeDrawer);$('#drawer-mask').addEventListener('click',closeDrawer);
$('#modal-close').addEventListener('click',closeModal);$('#modal-mask').addEventListener('click',e=>{if(e.target.id==='modal-mask')closeModal()});
$('#checkout-btn').addEventListener('click',showCheckout);
const fab=document.createElement('button');fab.id='cart-fab';fab.className='cart-fab';fab.style.display='none';
fab.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 4h2l2.4 12.2a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L20 8H6"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg><span id="fab-count">0</span>';
document.body.appendChild(fab);fab.addEventListener('click',openDrawer);updateCartUI()});
