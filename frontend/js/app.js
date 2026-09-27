const API_URL = 'http://localhost:5001/api';
const SOCKET_URL = API_URL.replace('/api','');
const token = localStorage.getItem('pm_token');
const user = JSON.parse(localStorage.getItem('pm_user') || 'null');
if (!token || !user) location.href='login.html';

const state = { projects:[], currentProject:null, tasks:[], socket:null };
const $ = id => document.getElementById(id);
const headers = () => ({ 'Content-Type':'application/json', Authorization:`Bearer ${token}` });

async function api(path, options={}) {
  const res=await fetch(`${API_URL}${path}`, { ...options, headers:{...headers(), ...(options.headers||{})} });
  const data=await res.json().catch(()=>({message:'Invalid server response'}));
  if(!res.ok) throw new Error(data.message || 'Something went wrong'); return data;
}
function toast(msg, type='success'){ const el=$('toast'); el.textContent=msg; el.className=`toast show ${type}`; setTimeout(()=>el.className='toast',2600); }
function esc(v=''){ return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function fmtDate(d){ return d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : 'No due date'; }

$('userName').textContent=user.name; $('userHandle').textContent='@'+user.username; $('avatar').textContent=user.name.charAt(0).toUpperCase();

async function loadProjects(){
  try { state.projects=await api('/projects'); renderProjects(); if(state.projects.length && !state.currentProject) selectProject(state.projects[0]._id); else if(!state.projects.length) showEmpty(); }
  catch(e){ toast(e.message,'error'); }
}
function renderProjects(){ $('projectList').innerHTML=state.projects.map(p=>`<button class="project-item ${state.currentProject?._id===p._id?'active':''}" data-project="${p._id}"><span class="project-icon">${esc(p.name.charAt(0).toUpperCase())}</span><span>${esc(p.name)}</span></button>`).join(''); document.querySelectorAll('[data-project]').forEach(b=>b.onclick=()=>selectProject(b.dataset.project)); }
async function selectProject(id){
  try { state.currentProject=await api(`/projects/${id}`); $('projectTitle').textContent=state.currentProject.name; $('projectDescription').textContent=state.currentProject.description || 'Team workspace'; $('emptyState').classList.add('hidden'); $('board').classList.remove('hidden'); $('newTaskBtn').classList.remove('hidden'); $('addMemberBtn').classList.remove('hidden'); renderProjects(); populateAssignees(); await loadTasks(); joinSocket(); }
  catch(e){ toast(e.message,'error'); }
}
function showEmpty(){ state.currentProject=null; $('projectTitle').textContent='Select a project'; $('projectDescription').textContent='Create a project and start collaborating.'; $('board').classList.add('hidden'); $('emptyState').classList.remove('hidden'); $('newTaskBtn').classList.add('hidden'); $('addMemberBtn').classList.add('hidden'); renderProjects(); }
async function loadTasks(){ state.tasks=await api(`/tasks/project/${state.currentProject._id}`); renderBoard(); }
function renderBoard(){ const cols={todo:$('todoTasks'),inprogress:$('progressTasks'),done:$('doneTasks')}; Object.values(cols).forEach(c=>c.innerHTML=''); const counts={todo:0,inprogress:0,done:0}; state.tasks.forEach(t=>{ counts[t.status]++; cols[t.status].insertAdjacentHTML('beforeend', taskCard(t)); }); $('todoCount').textContent=counts.todo; $('progressCount').textContent=counts.inprogress; $('doneCount').textContent=counts.done; Object.entries(cols).forEach(([k,c])=>{if(!c.children.length)c.innerHTML='<div class="column-empty">No tasks here</div>';}); }
function taskCard(t){ return `<article class="task-card" data-task="${t._id}"><div class="task-top"><span class="priority ${t.priority}">${t.priority}</span><button class="more-btn" data-menu="${t._id}">•••</button></div><h3>${esc(t.title)}</h3><p>${esc(t.description||'No description')}</p><div class="task-meta"><span>${t.assignedTo?`👤 ${esc(t.assignedTo.name)}`:'👤 Unassigned'}</span><span>📅 ${fmtDate(t.dueDate)}</span></div><div class="task-bottom"><span class="creator">by ${esc(t.createdBy?.name||'User')}</span><button class="open-task" data-open="${t._id}">View</button></div></article>`; }
function populateAssignees(){ $('taskAssignee').innerHTML='<option value="">Unassigned</option>'+state.currentProject.members.map(m=>`<option value="${m._id}">${esc(m.name)} (@${esc(m.username)})</option>`).join(''); }

$('projectList').addEventListener('click', e=>{const b=e.target.closest('[data-project]');if(b)selectProject(b.dataset.project);});
$('newProjectBtn').onclick=$('emptyCreateBtn').onclick=()=>openModal('projectModal');
$('addMemberBtn').onclick=()=>openModal('memberModal');
$('newTaskBtn').onclick=()=>openTaskModal();
$('logoutBtn').onclick=()=>{localStorage.removeItem('pm_token');localStorage.removeItem('pm_user');location.href='login.html';};

document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
function openModal(id){$(id).classList.add('show');} function closeModal(id){$(id).classList.remove('show');}

$('projectForm').onsubmit=async e=>{e.preventDefault();try{const p=await api('/projects',{method:'POST',body:JSON.stringify({name:$('projectName').value,description:$('projectDesc').value})});state.projects.unshift(p);closeModal('projectModal');$('projectForm').reset();await loadProjects();selectProject(p._id);toast('Project created');}catch(err){toast(err.message,'error');}};
$('memberForm').onsubmit=async e=>{e.preventDefault();try{state.currentProject=await api(`/projects/${state.currentProject._id}/members`,{method:'POST',body:JSON.stringify({username:$('memberUsername').value})});closeModal('memberModal');$('memberForm').reset();populateAssignees();toast('Member added');}catch(err){toast(err.message,'error');}};

function openTaskModal(task=null){ $('taskModalTitle').textContent=task?'Edit Task':'Create Task'; $('taskId').value=task?task._id:''; $('taskTitle').value=task?.title||''; $('taskDesc').value=task?.description||''; $('taskPriority').value=task?.priority||'medium'; $('taskStatus').value=task?.status||'todo'; $('taskAssignee').value=task?.assignedTo?._id||''; $('taskDue').value=task?.dueDate?new Date(task.dueDate).toISOString().slice(0,10):''; openModal('taskModal'); }
$('taskForm').onsubmit=async e=>{e.preventDefault();const id=$('taskId').value;const payload={title:$('taskTitle').value,description:$('taskDesc').value,priority:$('taskPriority').value,status:$('taskStatus').value,assignedTo:$('taskAssignee').value,dueDate:$('taskDue').value||null,project:state.currentProject._id};try{if(id)await api(`/tasks/${id}`,{method:'PATCH',body:JSON.stringify(payload)});else await api('/tasks',{method:'POST',body:JSON.stringify(payload)});closeModal('taskModal');await loadTasks();toast(id?'Task updated':'Task created');}catch(err){toast(err.message,'error');}};

$('board').addEventListener('click',e=>{const open=e.target.closest('[data-open]');if(open){const task=state.tasks.find(t=>t._id===open.dataset.open);if(task)openTaskDetail(task);} const menu=e.target.closest('[data-menu]');if(menu){const task=state.tasks.find(t=>t._id===menu.dataset.menu);if(task)openTaskModal(task);}});
async function openTaskDetail(task){ openModal('taskDetailModal'); $('taskDetail').innerHTML=`<div class="detail-head"><div><span class="priority ${task.priority}">${task.priority}</span><h2>${esc(task.title)}</h2><p class="muted">${esc(task.description||'No description')}</p></div><button id="detailEdit" class="secondary-btn">Edit</button></div><div class="detail-info"><span>👤 ${task.assignedTo?esc(task.assignedTo.name):'Unassigned'}</span><span>📅 ${fmtDate(task.dueDate)}</span><span>📌 ${task.status}</span></div><div class="comments"><h3>Comments & communication</h3><div id="commentList" class="comment-list">Loading...</div><form id="commentForm" class="comment-form"><input id="commentInput" placeholder="Write a comment..." required><button class="primary-btn">Send</button></form></div>`; $('detailEdit').onclick=()=>{closeModal('taskDetailModal');openTaskModal(task);}; await loadComments(task._id); $('commentForm').onsubmit=async e=>{e.preventDefault();try{await api('/comments',{method:'POST',body:JSON.stringify({task:task._id,text:$('commentInput').value})});$('commentInput').value='';await loadComments(task._id);toast('Comment added');}catch(err){toast(err.message,'error');}}; }
async function loadComments(id){const comments=await api(`/comments/task/${id}`);$('commentList').innerHTML=comments.length?comments.map(c=>`<div class="comment"><div class="comment-avatar">${esc(c.user.name.charAt(0))}</div><div><strong>${esc(c.user.name)}</strong><small>@${esc(c.user.username)} · ${new Date(c.createdAt).toLocaleString()}</small><p>${esc(c.text)}</p></div></div>`).join(''):'<div class="column-empty">No comments yet. Start the conversation.</div>';}

async function loadNotifications(){try{const ns=await api('/notifications');const unread=ns.filter(n=>!n.read).length;$('notificationCount').textContent=unread;$('notificationList').innerHTML=ns.length?ns.map(n=>`<button class="notification ${n.read?'read':''}" data-notification="${n._id}"><span>🔔</span><div>${esc(n.message)}<small>${new Date(n.createdAt).toLocaleString()}</small></div></button>`).join(''):'<div class="column-empty">No notifications</div>';}catch(e){}}
$('notificationBtn').onclick=()=>{$('notificationsPanel').classList.toggle('show');loadNotifications();};
$('readAllBtn').onclick=async()=>{await api('/notifications/read-all',{method:'PATCH'});loadNotifications();};
$('notificationList').onclick=async e=>{const n=e.target.closest('[data-notification]');if(n){await api(`/notifications/${n.dataset.notification}/read`,{method:'PATCH'});loadNotifications();}};
$('themeBtn').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('pm_theme',document.body.classList.contains('dark')?'dark':'light');};
if(localStorage.getItem('pm_theme')==='dark')document.body.classList.add('dark');

function joinSocket(){if(state.socket)state.socket.disconnect();state.socket=io(SOCKET_URL);state.socket.on('connect',()=>state.socket.emit('join-project',state.currentProject._id));state.socket.on('task-created',t=>{if(t.project===state.currentProject._id||t.project?._id===state.currentProject._id){if(!state.tasks.some(x=>x._id===t._id)){state.tasks.unshift(t);renderBoard();}}});state.socket.on('task-updated',t=>{const i=state.tasks.findIndex(x=>x._id===t._id);if(i>=0){state.tasks[i]=t;renderBoard();}});state.socket.on('task-deleted',id=>{state.tasks=state.tasks.filter(t=>t._id!==id);renderBoard();});state.socket.on('comment-added',()=>loadNotifications());state.socket.on('notification',()=>{loadNotifications();toast('New team activity');});}

loadProjects(); loadNotifications();
