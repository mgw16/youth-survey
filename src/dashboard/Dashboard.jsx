import { useEffect, useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { SURVEYS } from '../config/surveys.js'
import { fetchAll, subscribe, resetDemo, isLive, fetchOverrides, fetchBuilder } from '../lib/store.js'
import { assembleSurveys } from '../lib/assemble.js'
import Builder from './Builder.jsx'

const PASSCODE = import.meta.env.VITE_DASHBOARD_PASSCODE || 'woolshed'
const STATUS_ORDER = { eligible: 0, review: 1, ineligible: 2 }
const COLORS = { eligible: '#3f6b4c', review: '#9a6a2f', ineligible: '#a4453a' }

export default function Dashboard() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('wcs_dash') === '1')
  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />
  return <Live />
}

function Gate({ onUnlock }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState(false)
  const submit = () => {
    if (code === PASSCODE) {
      sessionStorage.setItem('wcs_dash', '1')
      onUnlock()
    } else setErr(true)
  }
  return (
    <div className="container gate">
      <div className="eyebrow">Facilitator</div>
      <h1 style={{ fontSize: 26, marginBottom: 16 }}>Results dashboard</h1>
      <div className="qcard">
        <label className="qsection" htmlFor="code">Passcode</label>
        <input id="code" className="field" type="password" value={code}
          onChange={(e) => { setCode(e.target.value); setErr(false) }}
          onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="Enter passcode" />
        {err && <div className="banner" style={{ marginTop: 16 }}>That passcode didn’t match. Try again.</div>}
        <div className="nav">
          <span />
          <button className="btn" onClick={submit}>Open dashboard</button>
        </div>
      </div>
    </div>
  )
}

function Live() {
  const [data, setData] = useState({ growers: [], responses: [] })
  const [tab, setTab] = useState(SURVEYS[0].id)
  const [loading, setLoading] = useState(true)
  const [openRow, setOpenRow] = useState(null)
  const [overrides, setOverrides] = useState({})
  const [custom, setCustom] = useState({ sections: [], questions: [] })
  const [editing, setEditing] = useState(false)

  const loadBuilder = () =>
    Promise.all([fetchOverrides(), fetchBuilder()])
      .then(([ov, c]) => { setOverrides(ov); setCustom(c) })
      .catch(() => {})

  useEffect(() => { loadBuilder() }, [])

  // The full survey: base questions + host wording edits + custom additions.
  const assembled = useMemo(() => assembleSurveys(SURVEYS, overrides, custom), [overrides, custom])
  const assembledById = useMemo(() => Object.fromEntries(assembled.map((s) => [s.id, s])), [assembled])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const d = await fetchAll()
        if (active) setData(d)
      } catch (e) { /* surfaced as empty state */ }
      finally { if (active) setLoading(false) }
    }
    load()
    const unsub = subscribe(() => { load(); loadBuilder() })
    return () => { active = false; unsub() }
  }, [])

  const survey = assembledById[tab] || assembled[0]

  // Build evaluated, ranked rows for the active survey.
  const rows = useMemo(() => {
    const byGrower = {}
    for (const r of data.responses) {
      if (r.survey_id !== tab) continue
      byGrower[r.grower_id] = byGrower[r.grower_id] || {}
      byGrower[r.grower_id][r.question_id] = r.value
    }
    const list = data.growers
      .filter((g) => byGrower[g.id])
      .map((g) => {
        const answers = byGrower[g.id]
        const result = survey.evaluate(answers)
        return { grower: g, answers, result }
      })
    list.sort((a, b) =>
      (STATUS_ORDER[a.result.status] - STATUS_ORDER[b.result.status]) ||
      (b.result.score - a.result.score)
    )
    return list
  }, [data, tab, survey])

  const totalGrowers = data.growers.length
  const eligible = rows.filter((r) => r.result.status === 'eligible').length
  const review = rows.filter((r) => r.result.status === 'review').length
  const ineligible = rows.filter((r) => r.result.status === 'ineligible').length

  return (
    <div className="container wide">
      <div className="dash-head">
        <div>
          <div className="eyebrow">Live results</div>
          <h1>{survey.title}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span className="live-dot"><i /> {isLive ? 'Updating in real time' : 'Demo data'}</span>
          <button className="btn subtle" onClick={() => setEditing((e) => !e)}>
            {editing ? '← Back to results' : '✎ Edit / build survey'}
          </button>
          {!isLive && (
            <button className="btn subtle" onClick={() => { resetDemo() }}>Reset demo data</button>
          )}
        </div>
      </div>

      {editing ? (
        <Builder overrides={overrides} custom={custom} reload={loadBuilder} />
      ) : (
      <>
      {!isLive && (
        <div className="banner">
          You’re viewing demo data so you can see how the room will look. Connect Supabase
          (see DEPLOY.md) and this fills with real growers as they submit.
        </div>
      )}

      <div className="tabs">
        {assembled.map((s) => (
          <button key={s.id} className={'tab' + (survey.id === s.id ? ' active' : '')} onClick={() => { setTab(s.id); setOpenRow(null) }}>
            {s.title}{s.custom ? ' ·' : ''}{s.custom ? <span className="badge custom" style={{ marginLeft: 6 }}>custom</span> : ''}
          </button>
        ))}
      </div>

      <div className="cards">
        <Stat n={totalGrowers} l="Properties assessed" />
        <Stat n={rows.length} l="Completed this section" />
        {!survey.custom && (survey.id === 'tree_planting' ? (
          <>
            <Stat n={eligible} l="Likely eligible" color={COLORS.eligible} />
            <Stat n={review} l="Needs discussion" color={COLORS.review} />
            <Stat n={ineligible} l="Likely ineligible" color={COLORS.ineligible} />
          </>
        ) : (
          <>
            <Stat n={rows.filter((r) => r.result.band === 'High').length} l="High improvement opportunity" color={COLORS.eligible} />
            <Stat n={rows.filter((r) => r.result.band === 'Medium').length} l="Medium opportunity" color={COLORS.review} />
            <Stat n={rows.filter((r) => r.result.band === 'Low').length} l="Lower opportunity" color={COLORS.ineligible} />
          </>
        ))}
      </div>

      {loading ? (
        <div className="panel center muted">Loading results…</div>
      ) : rows.length === 0 ? (
        <div className="panel center muted">
          No responses yet for this section. As growers submit, they’ll appear here automatically.
        </div>
      ) : (
        <>
          {!survey.custom && (
          <div className="charts">
            {survey.id === 'tree_planting' ? (
              <Panel title="Status breakdown" sub="How the room divides on eligibility">
                <StatusPie rows={rows} />
              </Panel>
            ) : (
              <Panel title="Opportunity breakdown" sub="Size of the targeted improvement across the room">
                <BandPie rows={rows} />
              </Panel>
            )}
            <Panel
              title={survey.id === 'tree_planting' ? 'Suitability ranking' : 'Targeted improvement ranking'}
              sub={survey.id === 'tree_planting' ? 'Score out of 100 — higher sits higher' : 'Average targeted lift (%) — higher sits higher'}
            >
              <ScoreBars rows={rows} byBand={survey.id !== 'tree_planting'} />
            </Panel>
          </div>
          )}

          {survey.questions.some((q) => q.type === 'scale') && (
            <Panel title="Average rating by area" sub="Where the group sits on the rating questions (1–5)">
              <DomainAverages rows={rows} survey={survey} />
            </Panel>
          )}

          {survey.questions.some((q) => q.type === 'target') && (
            <TargetPanels rows={rows} survey={survey} />
          )}

          <Panel title="Ranked properties" sub="Tap a row to see the reasoning and full answers">
            <RankTable rows={rows} survey={survey} scored={!survey.custom} openRow={openRow} setOpenRow={setOpenRow} />
          </Panel>
        </>
      )}

      <div className="footer-note">
        Eligibility and scores are computed from the rules in <span className="mono">src/config/surveys.js</span>.
        They’re a guide for discussion, not a final determination.
      </div>
      </>
      )}
    </div>
  )
}

/* ----------------------------- pieces ------------------------------------- */

function Stat({ n, l, color }) {
  return (
    <div className="stat">
      <div className="n" style={color ? { color } : undefined}>{n}</div>
      <div className="l">{l}</div>
    </div>
  )
}

function Panel({ title, sub, children }) {
  return (
    <div className="panel">
      <h3>{title}</h3>
      {sub && <div className="sub">{sub}</div>}
      {children}
    </div>
  )
}

function StatusPie({ rows }) {
  const counts = rows.reduce((acc, r) => { acc[r.result.status] = (acc[r.result.status] || 0) + 1; return acc }, {})
  const pieData = Object.entries(counts).map(([k, v]) => ({ name: label(k), key: k, value: v }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {pieData.map((d) => <Cell key={d.key} fill={COLORS[d.key] || '#999'} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

const BAND_COLORS = { High: '#2f6b46', Medium: '#a9762f', Low: '#b8b2a4' }

function BandPie({ rows }) {
  const order = ['High', 'Medium', 'Low']
  const counts = rows.reduce((acc, r) => { acc[r.result.band] = (acc[r.result.band] || 0) + 1; return acc }, {})
  const pieData = order.filter((b) => counts[b]).map((b) => ({ name: b + ' opportunity', key: b, value: counts[b] }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {pieData.map((d) => <Cell key={d.key} fill={BAND_COLORS[d.key] || '#999'} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

function ScoreBars({ rows, byBand }) {
  const d = rows.map((r) => ({
    name: shortName(r.grower),
    score: r.result.score,
    color: byBand ? (BAND_COLORS[r.result.band] || '#999') : (COLORS[r.result.status] || '#999'),
  }))
  return (
    <ResponsiveContainer width="100%" height={Math.max(240, d.length * 34)}>
      <BarChart data={d} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" domain={[0, byBand ? 'dataMax' : 100]} tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
        <Tooltip cursor={{ fill: '#f0ece2' }} />
        <Bar dataKey="score" radius={[0, 6, 6, 0]}>
          {d.map((row, i) => <Cell key={i} fill={row.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function DomainAverages({ rows, survey }) {
  const scaleQs = survey.questions.filter((q) => q.type === 'scale')
  const d = scaleQs.map((q) => {
    const vals = rows.map((r) => Number(r.answers[q.id])).filter((n) => n >= 1)
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    return { name: q.section, avg: Math.round(avg * 10) / 10 }
  })
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, d.length * 50)}>
      <BarChart data={d} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
        <Tooltip cursor={{ fill: '#f0ece2' }} />
        <Bar dataKey="avg" fill="#5a7d96" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function RankTable({ rows, survey, scored = true, openRow, setOpenRow }) {
  const colCount = scored ? 5 : 2
  return (
    <table className="rank">
      <thead>
        <tr>
          <th style={{ width: 36 }}>#</th>
          <th>Property</th>
          {scored && <th>Status</th>}
          {scored && <th style={{ width: 160 }}>Score</th>}
          {scored && <th style={{ width: 90 }}>Readiness</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const open = openRow === r.grower.id
          return (
            <FragmentRow key={r.grower.id}>
              <tr className="row" onClick={() => setOpenRow(open ? null : r.grower.id)}>
                <td className="rankno">{i + 1}</td>
                <td>
                  <b>{r.grower.property_name || r.grower.name}</b>
                  {r.grower.property_name && <div className="muted" style={{ fontSize: 13 }}>{r.grower.name}</div>}
                </td>
                {scored && <td><span className={'pill ' + r.result.status}>{label(r.result.status)}</span></td>}
                {scored && (
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="scorebar"><span style={{ width: r.result.score + '%', background: COLORS[r.result.status] }} /></div>
                    <span className="mono" style={{ fontSize: 13 }}>{r.result.score}</span>
                  </div>
                </td>
                )}
                {scored && <td>{r.result.band ? <span className={'pill ' + r.result.band}>{r.result.band}</span> : '—'}</td>}
              </tr>
              {open && (
                <tr>
                  <td colSpan={colCount}>
                    <div className="detail">
                      {scored && r.result.reasons?.length > 0 && (
                        <div className="reason"><b>Why:</b>
                          <ul>{r.result.reasons.map((x, j) => <li key={j}>{x}</li>)}</ul>
                        </div>
                      )}
                      {scored && r.result.flags?.length > 0 && (
                        <div className="flag" style={{ marginTop: 8 }}><b>To check:</b>
                          <ul>{r.result.flags.map((x, j) => <li key={j}>{x}</li>)}</ul>
                        </div>
                      )}
                      <div className="kv">
                        {survey.questions.filter((q) => q.type !== 'info' && r.answers[q.id] !== undefined).map((q) => (
                          <div key={q.id}><b>{q.prompt}</b><br />{formatAnswer(q, r.answers[q.id])}</div>
                        ))}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </FragmentRow>
          )
        })}
      </tbody>
    </table>
  )
}

// Tiny helper so we can return two <tr> together without a wrapper element.
function FragmentRow({ children }) { return <>{children}</> }

/* ----------------------------- formatting --------------------------------- */

function label(status) {
  return { eligible: 'Likely eligible', review: 'Needs discussion', ineligible: 'Likely ineligible' }[status] || status
}

function shortName(g) {
  return (g.property_name || g.name || '').replace(' (demo)', '').slice(0, 18)
}

function formatAnswer(q, value) {
  if (value === undefined || value === null || value === '') return '—'
  if (q.type === 'target') {
    if (typeof value !== 'object') return '—'
    const o = q.options || {}
    const unit = o.unit || ''
    const dir = o.direction === 'decrease' ? -1 : 1
    const delta = dir * ((value.target ?? 0) - (value.current ?? 0))
    const pct = value.current ? (delta / value.current) * 100 : 0
    const sign = delta > 0 ? '+' : ''
    return `${value.current}${unit} → ${value.target}${unit}  (${sign}${round(delta)}${unit}, ${sign}${round(pct)}%)`
  }
  if (q.type === 'scale') return `${value} / ${q.options?.max ?? 5}`
  if (q.type === 'number') return `${value}${q.options?.unit ? ' ' + q.options.unit : ''}`
  if (q.type === 'multi_choice') {
    const arr = Array.isArray(value) ? value : [value]
    return arr.map((v) => optLabel(q, v)).join(', ')
  }
  if (q.type === 'single_choice' || q.type === 'yes_no' || q.type === 'yes_no_unsure') {
    return optLabel(q, value)
  }
  return String(value)
}

function optLabel(q, v) {
  const builtin = { yes: 'Yes', no: 'No', unsure: 'Unsure' }
  const found = q.options?.find?.((o) => o.value === v)
  return found ? found.label : builtin[v] || v
}

function round(n) { return Math.round((Number(n) || 0) * 10) / 10 }

/* ----------------------- target improvement panel ------------------------- */

function TargetPanels({ rows, survey }) {
  const targetQs = survey.questions.filter((q) => q.type === 'target')
  return (
    <>
      {targetQs.map((q) => {
        const o = q.options || {}
        const unit = o.unit || ''
        const dir = o.direction === 'decrease' ? -1 : 1
        const entries = rows
          .map((r) => ({ name: shortName(r.grower), v: r.answers[q.id] }))
          .filter((e) => e.v && typeof e.v === 'object' && typeof e.v.current === 'number')
          .map((e) => {
            const delta = dir * ((e.v.target ?? 0) - (e.v.current ?? 0))
            const pct = e.v.current ? (delta / e.v.current) * 100 : 0
            return { name: e.name, current: e.v.current, target: e.v.target, delta: round(delta), pct: round(pct) }
          })
        if (entries.length === 0) return null
        const avgDelta = round(entries.reduce((a, b) => a + b.delta, 0) / entries.length)
        const avgPct = round(entries.reduce((a, b) => a + b.pct, 0) / entries.length)
        const chartData = entries.map((e) => ({ name: e.name, current: e.current, target: e.target }))
        return (
          <Panel key={q.id} title={q.prompt} sub={`Current vs target (${unit}) — average lift ${avgDelta}${unit} (${avgPct}%)`}>
            <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 40)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f0ece2' }} />
                <Legend />
                <Bar dataKey="current" name="Current" fill="#c2b8a3" radius={[0, 4, 4, 0]} />
                <Bar dataKey="target" name="Target" fill="#2f6b46" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )
      })}
    </>
  )
}

