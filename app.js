// Simple Habit Tracker - localStorage-based
const STORAGE_KEY = 'habitTasks_v1'
let tasks = []
let audioDataUrl = null
let chart = null

document.addEventListener('DOMContentLoaded', () => {
  // elements
  const input = document.getElementById('task-input')
  const addBtn = document.getElementById('add-btn')
  const list = document.getElementById('task-list')
  const upload = document.getElementById('audio-upload')

  load()
  render()
  initChart()

  addBtn.addEventListener('click', () => {
    const title = input.value.trim()
    if (!title) return
    addTask(title)
    input.value = ''
     render()
  })
  input.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click() })

  upload.addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    audioDataUrl = dataUrl
    save()
    alert('Audio uploaded. It will play when you complete a habit.')
  })

  function render(){
    list.innerHTML = ''
    tasks.forEach(task => {
      const li = document.createElement('li')
      li.className = 'task'
      const left = document.createElement('div'); left.className = 'task-left'
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'
      // mark checked if task has completion today
      checkbox.checked = hasCompletedToday(task)
      checkbox.addEventListener('change', () => toggleComplete(task.id, checkbox.checked))
      const title = document.createElement('div'); title.className = 'task-title'; title.textContent = task.title
      const meta = document.createElement('div'); meta.className = 'small'; meta.textContent = Streak: ${computeStreak(task)}
      left.appendChild(checkbox); left.appendChild(title); left.appendChild(meta)

      const right = document.createElement('div')
      const del = document.createElement('button'); del.textContent = 'Delete'
      del.style.background = '#e53e3e'
      del.addEventListener('click', () => { if (confirm('Delete this habit?')) { removeTask(task.id) } })
      right.appendChild(del)

      li.appendChild(left); li.appendChild(right)
      list.appendChild(li)
    })
    updateChart()
  }

  // storage + helpers
  function load(){
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try { const parsed = JSON.parse(raw); tasks = parsed.tasks || []; audioDataUrl = parsed.audio || null } catch(e) { tasks = []; audioDataUrl = null }
    }
  }
  function save(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify({tasks, audio: audioDataUrl}))
  }
  function addTask(title){
    tasks.push({id: Date.now().toString(), title, completions: []})
    save()
  }
  function removeTask(id){
    tasks = tasks.filter(t => t.id !== id)
    save()
    render()
  }
  async function toggleComplete(id, checked){
    const task = tasks.find(t => t.id === id)
    if (!task) return
    if (checked){
      // add timestamp for now
      task.completions.push(new Date().toISOString())
      if (audioDataUrl) playAudio(audioDataUrl)
    } else {
      // remove today's completion if unchecking
      task.completions = task.completions.filter(ts => !isSameDay(new Date(), new Date(ts)))
    }
    save()
    render()
  }

  function hasCompletedToday(task){
    return task.completions.some(ts => isSameDay(new Date(), new Date(ts)))
  }

  function computeStreak(task){
    // count consecutive days including today with >=1 completion
    const daysWith = new Set(task.completions.map(ts => new Date(ts).toDateString()))
    let streak = 0
    for (let i = 0; ; i++){
      const d = new Date(); d.setDate(d.getDate() - i)
      if (daysWith.has(d.toDateString())) streak++
      else break
    }
    return streak
  }

  function isSameDay(a,b){
    return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
  }

  function fileToDataUrl(file){
    return new Promise(res => {
      const r = new FileReader()
      r.onload = () => res(r.result)
      r.readAsDataURL(file)
    })
  }

  function playAudio(dataUrl){
    try{ const a = new Audio(dataUrl); a.play().catch(()=>{}) } catch(e){}
  }

  // Chart
  function initChart(){
    const ctx = document.getElementById('chart').getContext('2d')
    chart = new Chart(ctx, {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Completions', data: [], backgroundColor: '#60a5fa' }] },
      options: { responsive:true, maintainAspectRatio:false, scales:{y:{beginAtZero:true,precision:0}} }
    })
    updateChart()
  }

  function updateChart(){
    const last7 = getLast7Counts()
    chart.data.labels = last7.labels
    chart.data.datasets[0].data = last7.counts
    chart.update()
  }

  function getLast7Counts(){
    const counts = []
    const labels = []
    for (let i = 6; i >= 0; i--){
      const d = new Date(); d.setDate(d.getDate() - i)
      const label = d.toLocaleDateString(undefined, {weekday:'short'})
      labels.push(label)
      const dateStr = d.toDateString()
      let total = 0
      tasks.forEach(t => {
        total += t.completions.filter(ts => new Date(ts).toDateString() === dateStr).length
      })
      counts.push(total)
    }
    return {labels, counts}
  }
})
