const $=s=>document.querySelector(s);const $$=s=>document.querySelectorAll(s);const API='';
let PW=sessionStorage.getItem('shop_pw')||'';let products=[];let orders=[];let cats=[];
const STATUS_CN={pending:'待处理',shipped:'已发货',done:'已完成',cancelled:'已取消'};
const fmtUsd=n=>'$'+Number(n||0).toFixed(2);
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function api(path,opts={}){const o=Object.assign({},opts);o.headers=Object.assign({'Content-Type':'application/json','X-Admin-Password':PW},opts.headers||{});return fetch(path,o)}
function showLogin(){$('#login-view').style.display='block';$('#panel-view').style.display='none'}
async function showPanel(){$('#login-view').style.display='none';$('#panel-view').style.display='block';await loadCats();loadProducts()}
async function loadCats(){try{cats=await(await fetch('/api/categories')).json()}catch(e){cats=[]}
const sel=$('#f-category');if(sel)sel.innerHTML='<option value="">未分类</option>'+cats.map(c=>`<option value="${c.id}">${esc(c.name||c.id)}</option>`).join('');
const filt=$('#filter-category');if(filt)filt.innerHTML='<option value="">全部分类</option>'+cats.map(c=>`<option value="${c.id}">${esc(c.name||c.id)}</option>`).join('')}
$('#login-btn').addEventListener('click',async()=>{PW=$('#pw').value.trim();
if((await api('/api/products')).status===200){sessionStorage.setItem('shop_pw',PW);showPanel()}
else{$('#login-msg').textContent='密码错误，请重试。';$('#login-msg').className='admin-msg err'}});
$('#pw').addEventListener('keydown',e=>{if(e.key==='Enter')$('#login-btn').click()});
$('#logout-btn').addEventListener('click',()=>{sessionStorage.removeItem('shop_pw');PW='';showLogin()});
$$('.tab').forEach(t=>t.addEventListener('click',()=>{$$('.tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');
['products','orders','stats'].forEach(n=>{$('#tab-'+n).style.display=(n===t.dataset.tab)?'block':'none'});
if(t.dataset.tab==='orders')loadOrders();if(t.dataset.tab==='stats')loadStats()}));
$('#f-file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;
const fd=new FormData();fd.append('file',f);
const r=await fetch('/api/upload',{method:'POST',headers:{'X-Admin-Password':PW},body:fd});const d=await r.json();
if(d.ok){$('#f-image').value=d.url;setPreview(d.url);msg('图片上传成功')}else msg('上传失败：'+(d.error||'未知错误'),true)});
$('#f-image').addEventListener('input',e=>setPreview(e.target.value));
function setPreview(url){const img=$('#f-preview');if(url){img.src=url;img.style.display='block'}else img.style.display='none'}
$('#save-btn').addEventListener('click',async()=>{const id=$('#edit-id').value;
const body={name:$('#f-name').value.trim(),price_usd:parseFloat($('#f-price').value||0),category:$('#f-category').value,desc:$('#f-desc').value.trim(),detail:$('#f-detail').value.trim(),image:$('#f-image').value.trim()||'/static/img/p1.jpg'};
if(!body.name){msg('请填写商品名称',true);return}if(!(body.price_usd>0)){msg('请填写有效的美元价格',true);return}
const r=id?await api('/api/products/'+id,{method:'PUT',body:JSON.stringify(body)}):await api('/api/products',{method:'POST',body:JSON.stringify(body)});
if(r.ok){msg(id?'已更新商品':'已上传新商品');resetForm();loadProducts()}else{const d=await r.json().catch(()=>({}));msg('保存失败：'+(d.error||r.status),true)}});
$('#cancel-btn').addEventListener('click',resetForm);
function resetForm(){$('#edit-id').value='';$('#f-name').value='';$('#f-price').value='';$('#f-category').value='';$('#f-desc').value='';$('#f-detail').value='';$('#f-image').value='';$('#f-file').value='';setPreview('');$('#form-title').textContent='上传新商品';$('#cancel-btn').style.display='none'}
function msg(t,isErr){const m=$('#form-msg');m.textContent=t;m.className='admin-msg'+(isErr?' err':'');setTimeout(()=>{m.textContent=''},3000)}
function catTag(id){if(!id)return '<span class="tag none">未分类</span>';const c=cats.find(x=>x.id===id);return `<span class="tag ${id}">${esc(c?c.name:id)}</span>`}
async function loadProducts(){products=await(await api('/api/products')).json();
const fc=$('#filter-category').value;const list=fc?products.filter(p=>(p.category||'')===fc):products;const w=$('#product-list');
if(!list.length){w.innerHTML='<p class="empty-tip">还没有商品。</p>';return}
w.innerHTML=list.map(p=>`<div class="admin-row"><img src="${p.image||'/static/img/p1.jpg'}" alt=""><div class="meta"><h4>${esc(p.name)} ${catTag(p.category)}</h4><span>${fmtUsd(p.price_usd)}</span><p>${esc(p.desc||'')}</p></div><div class="row-actions"><button data-edit="${p.id}">编辑</button><button class="danger" data-del="${p.id}">删除</button></div></div>`).join('');
w.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>editProduct(b.dataset.edit)));
w.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>delProduct(b.dataset.del)))}
document.addEventListener('change',e=>{if(e.target&&e.target.id==='filter-category')loadProducts()});
function editProduct(id){const p=products.find(x=>x.id===id);if(!p)return;
$('#edit-id').value=p.id;$('#f-name').value=p.name;$('#f-price').value=p.price_usd;$('#f-category').value=p.category||'';$('#f-desc').value=p.desc||'';$('#f-detail').value=p.detail||'';$('#f-image').value=p.image||'';setPreview(p.image);
$('#form-title').textContent='编辑商品：'+p.name;$('#cancel-btn').style.display='inline-flex';window.scrollTo({top:0,behavior:'smooth'})}
async function delProduct(id){if(!confirm('确定要删除这个商品吗？'))return;
if((await api('/api/products/'+id,{method:'DELETE'})).ok){loadProducts();msg('已删除')}else msg('删除失败',true)}
async function loadOrders(){orders=await(await api('/api/orders')).json();const w=$('#order-list');
if(!orders.length){w.innerHTML='<p class="empty-tip">暂无订单。</p>';return}
w.innerHTML=orders.map(o=>{const s=o.shipping||{};const items=(o.items||[]).map(i=>`${esc(i.name)} × ${i.qty}（${fmtUsd(i.subtotal)}）`).join('<br>');
const opts=['pending','shipped','done','cancelled'].map(k=>`<option value="${k}" ${o.status===k?'selected':''}>${STATUS_CN[k]}</option>`).join('');
return `<div class="order-card"><div class="order-top"><div><span class="order-no-t">${esc(o.order_no)}</span><span class="order-time"> · ${esc(o.created_at)}</span></div><span class="badge ${o.status}">${STATUS_CN[o.status]||o.status}</span></div><div class="order-body"><div class="order-block"><h5>商品明细</h5><div class="order-items">${items}</div><div style="margin-top:8px;color:var(--gold2);font-weight:600">合计：${fmtUsd(o.total_usd)}</div></div><div class="order-block"><h5>收货信息</h5><div class="kv"><b>${esc(s.name||'')}</b><br>电话：${esc(s.phone||'')}<br>${s.email?'邮箱：'+esc(s.email)+'<br>':''}${esc(s.country||'')} ${esc(s.province||'')} ${esc(s.city||'')}<br>${esc(s.address||'')} ${esc(s.zipcode||'')}${s.note?'<br>备注：'+esc(s.note):''}</div></div></div><div class="order-actions"><select data-status="${o.order_no}">${opts}</select><button data-del-order="${o.order_no}">删除订单</button></div></div>`}).join('');
w.querySelectorAll('[data-status]').forEach(sel=>sel.addEventListener('change',async()=>{await api('/api/orders/'+sel.dataset.status,{method:'PUT',body:JSON.stringify({status:sel.value})});loadOrders()}));
w.querySelectorAll('[data-del-order]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('确定删除该订单？'))return;await api('/api/orders/'+b.dataset.delOrder,{method:'DELETE'});loadOrders()}))}
$('#export-btn').addEventListener('click',async()=>{const r=await api('/api/orders/export.csv');if(!r.ok){alert('导出失败');return}
const blob=await r.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='orders.csv';a.click();URL.revokeObjectURL(url)});
async function loadStats(){const d=await(await api('/api/stats')).json();
const catHtml=Object.entries(d.by_category||{}).map(([c,n])=>`${esc(c)}：${n} 个`).join(' · ')||'无';
$('#stats-grid').innerHTML=`<div class="stat-card"><div class="label">总订单数</div><div class="value">${d.total_orders}</div></div><div class="stat-card"><div class="label">商品总件数</div><div class="value">${d.total_qty}</div></div><div class="stat-card"><div class="label">订单总金额（美元）</div><div class="value">${fmtUsd(d.total_usd)}</div></div><div class="stat-card"><div class="label">待处理</div><div class="value">${d.by_status.pending||0}</div></div><div class="stat-card"><div class="label">已发货</div><div class="value">${d.by_status.shipped||0}</div></div><div class="stat-card"><div class="label">已完成</div><div class="value">${d.by_status.done||0}</div></div>`;
const cs=Object.entries(d.by_country||{}).sort((a,b)=>b[1]-a[1]);
$('#stats-country').innerHTML=(cs.length?cs.map(([c,n])=>`${esc(c)}：${n} 单`).join('<br>'):'<span style="color:var(--muted)">暂无数据</span>')+`<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--line)"><span style="color:var(--muted)">商品分类：</span>${catHtml}</div>`}
(async()=>{if(PW){if((await api('/api/products')).status===200){showPanel();return}PW='';sessionStorage.removeItem('shop_pw')}showLogin()})();
