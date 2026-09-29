const categories = [
  {name:"Food & Dining", icon:"fa-utensils", color:"#ef4444"},
  {name:"Transport", icon:"fa-car", color:"#3b82f6"},
  {name:"Shopping", icon:"fa-bag-shopping", color:"#8b5cf6"},
  {name:"Bills", icon:"fa-lightbulb", color:"#f59e0b"},
  {name:"Entertainment", icon:"fa-gamepad", color:"#22c55e"},
  {name:"Others", icon:"fa-ellipsis", color:"#64748b"}
];

const seed = [
  {id:1,type:"expense",title:"Lunch at Pizza Hut",category:"Food & Dining",amount:25.50,date:"2025-05-31",note:"Lunch"},
  {id:2,type:"income",title:"Monthly Salary",category:"Salary",amount:2500,date:"2025-05-31",note:"May salary"},
  {id:3,type:"expense",title:"New Shoes",category:"Shopping",amount:120,date:"2025-05-30",note:"Running shoes"},
  {id:4,type:"expense",title:"Electricity Bill",category:"Bills",amount:80,date:"2025-05-30",note:"May 2025"},
  {id:5,type:"expense",title:"Bus Ticket",category:"Transport",amount:15,date:"2025-05-29",note:"Campus travel"},
  {id:6,type:"expense",title:"Movie Night",category:"Entertainment",amount:30,date:"2025-05-28",note:"Weekend"}
];

let transactions = JSON.parse(localStorage.getItem("expenseTransactions")) || seed;
let budget = Number(localStorage.getItem("expenseBudget")) || 4000;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = n => `$${Number(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const dateText = d => new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});

function save(){
  localStorage.setItem("expenseTransactions",JSON.stringify(transactions));
  localStorage.setItem("expenseBudget",budget);
}

function totals(){
  const income=transactions.filter(t=>t.type==="income").reduce((a,t)=>a+t.amount,0);
  const expense=transactions.filter(t=>t.type==="expense").reduce((a,t)=>a+t.amount,0);
  return {income,expense,balance:income-expense};
}

function populateCategories(){
  const options = categories.map(c=>`<option value="${c.name}">${c.name}</option>`).join("");
  $("#category").innerHTML = options;
  $("#categoryFilter").innerHTML = `<option value="all">All Categories</option>` + options;
}

function iconFor(t){
  if(t.category==="Salary") return ["fa-money-bill-wave","#22c55e"];
  const c=categories.find(x=>x.name===t.category) || categories.at(-1);
  return [c.icon,c.color];
}

function transactionHTML(t, showDelete=true){
  const [icon,color]=iconFor(t);
  return `<div class="transaction-row">
    <div class="transaction-main">
      <div class="transaction-icon" style="background:${color}18;color:${color}"><i class="fa-solid ${icon}"></i></div>
      <div><strong>${escapeHTML(t.title)}</strong><small>${escapeHTML(t.note || t.category)}</small></div>
    </div>
    <span class="tag ${t.type}">${t.type==="income"?"Income":t.category}</span>
    <span class="amount ${t.type}">${t.type==="income"?"+":"-"}${money(t.amount)}</span>
    <span class="date">${dateText(t.date)}</span>
    ${showDelete?`<button class="delete-btn" data-delete="${t.id}" title="Delete"><i class="fa-solid fa-ellipsis"></i></button>`:""}
  </div>`;
}

function escapeHTML(s){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

function updateDashboard(){
  const t=totals();
  $("#balanceValue").textContent=money(t.balance);
  $("#incomeValue").textContent=money(t.income);
  $("#expenseValue").textContent=money(t.expense);
  $("#transactionCount").textContent=transactions.length;
  $("#balanceChange").textContent=t.balance>=0?"Healthy positive balance":"Expenses are higher than income";

  const recent=[...transactions].sort((a,b)=>new Date(b.date)-new Date(a.date)||b.id-a.id).slice(0,6);
  $("#recentTransactions").innerHTML=recent.length?recent.map(x=>transactionHTML(x)).join(""):`<div class="empty"><i class="fa-regular fa-folder-open"></i><br>No transactions yet.</div>`;

  updateCategories();
  drawChart();
  updateBudget();
  updateReports();
}

function updateCategories(){
  const expenseTotal=totals().expense;
  const used = categories.map(c=>({...c,total:transactions.filter(t=>t.type==="expense"&&t.category===c.name).reduce((a,t)=>a+t.amount,0)})).filter(c=>c.total>0);
  const total=used.reduce((a,c)=>a+c.total,0)||1;
  const colors=used.map(c=>`${c.color} ${c.total/total*100}%`);
  $("#donutChart").style.background=used.length?`conic-gradient(${used.map((c,i)=>`${c.color} ${used.slice(0,i).reduce((a,x)=>a+x.total,0)/total*100}% ${used.slice(0,i+1).reduce((a,x)=>a+x.total,0)/total*100}%`).join(",")})`:"conic-gradient(#e5e7eb 0 100%)";
  $("#donutTotal").textContent=money(expenseTotal).replace(".00","");
  $("#categoryList").innerHTML=used.length?used.map(c=>`<div class="category-row"><span class="cat-left"><span class="dot" style="background:${c.color}"></span>${c.name}</span><span>${money(c.total)} <small>${Math.round(c.total/total*100)}%</small></span></div>`).join(""):`<div class="empty">No expense data yet.</div>`;

  $("#categoryCards").innerHTML=categories.map(c=>{
    const amount=transactions.filter(t=>t.type==="expense"&&t.category===c.name).reduce((a,t)=>a+t.amount,0);
    const pct=expenseTotal?Math.min(amount/expenseTotal*100,100):0;
    return `<div class="category-box"><div class="big-icon" style="background:${c.color}18;color:${c.color}"><i class="fa-solid ${c.icon}"></i></div><h3>${c.name}</h3><p>${Math.round(pct)}% of total expenses</p><strong>${money(amount)}</strong><div class="mini-progress"><span style="width:${pct}%;background:${c.color}"></span></div></div>`;
  }).join("");
}

function updateTransactions(){
  const q=$("#searchInput").value.toLowerCase();
  const type=$("#typeFilter").value;
  const cat=$("#categoryFilter").value;
  const filtered=[...transactions].filter(t=>{
    const text=(t.title+" "+t.category+" "+(t.note||"")).toLowerCase();
    return text.includes(q)&&(type==="all"||t.type===type)&&(cat==="all"||t.category===cat);
  }).sort((a,b)=>new Date(b.date)-new Date(a.date)||b.id-a.id);
  $("#allTransactions").innerHTML=filtered.length?filtered.map(t=>transactionHTML(t)).join(""):`<div class="empty"><i class="fa-solid fa-magnifying-glass"></i><br>No matching transactions.</div>`;
}

function drawChart(){
  const canvas=$("#overviewChart"), ctx=canvas.getContext("2d"), dpr=devicePixelRatio||1;
  const rect=canvas.getBoundingClientRect(); canvas.width=rect.width*dpr; canvas.height=235*dpr; ctx.scale(dpr,dpr);
  const w=rect.width,h=235,p={l:42,r:12,t:18,b:28}; ctx.clearRect(0,0,w,h);
  const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const income=[120,300,250,280,520,430,610], expense=[80,170,120,220,340,260,390];
  const max=700, x=i=>p.l+i*((w-p.l-p.r)/(days.length-1)), y=v=>p.t+(max-v)/max*(h-p.t-p.b);
  ctx.font="10px Poppins"; ctx.fillStyle=getComputedStyle(document.body).getPropertyValue("--muted");
  [0,250,500,750].forEach(v=>{if(v>max)return;ctx.strokeStyle=getComputedStyle(document.body).getPropertyValue("--border");ctx.beginPath();ctx.moveTo(p.l,y(v));ctx.lineTo(w-p.r,y(v));ctx.stroke();ctx.fillText("$"+(v>=1000?v/1000+"k":v),4,y(v)+4)});
  days.forEach((d,i)=>ctx.fillText(d,x(i)-9,h-7));
  function line(data,stroke,fill){
    ctx.beginPath();data.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.lineTo(x(6),h-p.b);ctx.lineTo(x(0),h-p.b);ctx.closePath();ctx.fillStyle=fill;ctx.fill();
    ctx.beginPath();data.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();
    data.forEach((v,i)=>{ctx.beginPath();ctx.arc(x(i),y(v),3,0,Math.PI*2);ctx.fillStyle=stroke;ctx.fill()});
  }
  line(income,"#22c55e","#22c55e12"); line(expense,"#ef4444","#ef444412");
}

function updateBudget(){
  const spent=totals().expense, pct=budget?Math.min(spent/budget*100,100):0;
  $("#budgetInput").value=budget;$("#budgetSpent").textContent=money(spent);$("#budgetPercent").textContent=Math.round(pct)+"%";$("#budgetProgress").style.width=pct+"%";
  $("#budgetMessage").textContent=spent>budget?"⚠️ You have exceeded your monthly budget.":`You have ${money(Math.max(budget-spent,0))} remaining this month.`;
}

function updateReports(){
  const t=totals();$("#reportIncome").textContent=money(t.income);$("#reportExpense").textContent=money(t.expense);$("#reportSavings").textContent=money(t.balance);
  const data=[120,260,180,340,290,410,360];const max=Math.max(...data);
  $("#reportBars").innerHTML=data.map((v,i)=>`<div class="bar-wrap"><div class="bar" style="height:${Math.max(v/max*170,8)}px"></div><span>${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</span></div>`).join("");
}

function showPage(page){
  $$(".page").forEach(p=>p.classList.remove("active-page"));
  const target=$("#"+page+"Page");if(target)target.classList.add("active-page");
  $$(".nav-link").forEach(n=>n.classList.toggle("active",n.dataset.page===page));
  const titles={dashboard:["Dashboard","Welcome back, Moniruzzaman 👋"],transactions:["Transactions","Manage your income and expenses"],add:["Add Transaction","Record a new financial activity"],categories:["Categories","Understand where your money goes"],reports:["Reports","Review your financial performance"],budget:["Budget","Stay on track with your spending limit"],settings:["Settings","Customize your Expense Tracker"]};
  $("#pageTitle").textContent=titles[page][0];$("#pageSubtitle").textContent=titles[page][1];
  if(page==="transactions")updateTransactions();
  $(".sidebar").classList.remove("open");
  window.scrollTo({top:0,behavior:"smooth"});
}

function toast(message){
  const el=$("#toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2200);
}

function toggleTheme(){
  document.body.classList.toggle("dark");
  const on=document.body.classList.contains("dark");
  $$("#themeToggle,#themeToggleSettings").forEach(x=>x&&x.classList.toggle("on",on));
  localStorage.setItem("expenseDark",on);
  drawChart();
}

document.addEventListener("click",e=>{
  const nav=e.target.closest("[data-page]");if(nav){showPage(nav.dataset.page);return}
  const del=e.target.closest("[data-delete]");if(del){const id=Number(del.dataset.delete);transactions=transactions.filter(t=>t.id!==id);save();updateDashboard();updateTransactions();toast("Transaction deleted");}
});
$$(".nav-link").forEach(x=>x.addEventListener("click",()=>showPage(x.dataset.page)));
$("#mobileMenu").addEventListener("click",()=>$(".sidebar").classList.toggle("open"));
$("#themeToggle").addEventListener("click",toggleTheme);
$("#themeToggleSettings").addEventListener("click",toggleTheme);
$("#clearData").addEventListener("click",()=>{if(confirm("Delete all transactions?")){transactions=[];save();updateDashboard();updateTransactions();toast("All data cleared");}});
["searchInput","typeFilter","categoryFilter"].forEach(id=>$("#"+id).addEventListener("input",updateTransactions));
$("#budgetInput").addEventListener("change",e=>{budget=Math.max(0,Number(e.target.value)||0);save();updateBudget();toast("Budget updated");});
window.addEventListener("resize",drawChart);

$("#transactionForm").addEventListener("submit",e=>{
  e.preventDefault();
  const type=document.querySelector('input[name="type"]:checked').value;
  const amount=Number($("#amount").value);
  transactions.push({id:Date.now(),type,title:$("#title").value.trim(),category:$("#category").value,amount,date:$("#date").value,note:$("#note").value.trim()});
  save();e.target.reset();$("#date").value=new Date().toISOString().slice(0,10);populateCategories();updateDashboard();toast("Transaction added successfully");showPage("dashboard");
});

document.body.classList.toggle("dark",localStorage.getItem("expenseDark")==="true");
$("#date").value=new Date().toISOString().slice(0,10);
populateCategories();
updateDashboard();
