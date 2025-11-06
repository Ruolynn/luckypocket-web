#!/usr/bin/env node
// Update Linear issues' state by identifier, using team key workflow states

const API_URL = 'https://api.linear.app/graphql'
const API_KEY = process.env.LINEAR_API_KEY
const TEAM_KEY = process.env.LINEAR_TEAM_KEY || 'ZES'
if (!API_KEY) {
  console.error('Missing LINEAR_API_KEY')
  process.exit(1)
}

async function gql(query, variables) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: API_KEY },
    body: JSON.stringify({ query, variables }),
  })
  const data = await res.json()
  if (data.errors) throw new Error(JSON.stringify(data.errors))
  return data.data
}

async function getTeamAndStates(teamKey) {
  // Try multiple ways to get states
  const q1 = `query($first:Int!){ teams(first:$first){nodes{id key name } } }`
  const d1 = await gql(q1, { first: 50 })
  const team = d1.teams.nodes.find((t) => t.key === teamKey)
  if (!team) throw new Error(`Team not found: ${teamKey}`)

  // Get workflow states via team's default workflow
  const q2 = `query($teamId:String!){ team(id:$teamId){ defaultWorkflowState { id name } workflowStates { nodes { id name type } } } }`
  try {
    const d2 = await gql(q2, { teamId: team.id })
    const states = d2.team?.workflowStates?.nodes || []
    if (states.length) return { teamId: team.id, states }
  } catch (e) {
    console.warn('Failed to get workflowStates, trying alternative...')
  }

  // Fallback: query project states (if project exists)
  const q3 = `query{ workflowStates(first:50){ nodes { id name type } } }`
  try {
    const d3 = await gql(q3, {})
    const states = d3.workflowStates?.nodes || []
    if (states.length) return { teamId: team.id, states }
  } catch (e) {
    console.warn('Failed to get workflowStates from root query')
  }

  throw new Error('Could not retrieve workflow states. Please check Linear API permissions.')
}

async function getIssueId(identifier, teamKey) {
  // Fallback: query all team issues and filter
  const q2 = `query($teamKey:String!){ team(key:$teamKey){ issues(first:100){ nodes{ id identifier } } } }`
  try {
    const d2 = await gql(q2, { teamKey })
    const node = d2.team?.issues?.nodes?.find((n) => n.identifier === identifier)
    if (node) return node.id
  } catch (e) {
    console.warn(`Failed to query team issues: ${e.message}`)
  }

  return null
}

async function updateIssueState(issueId, stateId) {
  const m = `mutation($id:String!,$stateId:String!){ issueUpdate(id:$id, input:{ stateId:$stateId }){ success issue{ id identifier state{ name } } } }`
  const d = await gql(m, { id: issueId, stateId })
  return d.issueUpdate
}

async function main() {
  const updatesArg = process.env.LINEAR_UPDATES || ''
  if (!updatesArg) {
    console.log('No updates provided. Set LINEAR_UPDATES="ZES-172=Done,ZES-174=Done"')
    process.exit(0)
  }

  console.log(`Getting team and states for ${TEAM_KEY}...`)
  let states, stateByName
  try {
    const result = await getTeamAndStates(TEAM_KEY)
    states = result.states
    stateByName = new Map(states.map((s) => [s.name.toLowerCase(), s.id]))
    console.log(`Found ${states.length} states: ${states.map((s) => s.name).join(', ')}`)
  } catch (e) {
    console.error(`Failed to get states: ${e.message}`)
    process.exit(1)
  }

  const pairs = updatesArg.split(',').map((p) => p.trim()).filter(Boolean)
  let successCount = 0
  let failCount = 0

  for (const pair of pairs) {
    const [identifier, stateNameRaw] = pair.split('=')
    if (!identifier || !stateNameRaw) {
      console.error(`Invalid format: ${pair}. Expected: IDENTIFIER=STATE_NAME`)
      failCount++
      continue
    }

    const stateName = stateNameRaw.trim()
    const stateId = stateByName.get(stateName.toLowerCase())
    if (!stateId) {
      console.error(`State not found: "${stateName}". Available: ${states.map((s) => s.name).join(', ')}`)
      failCount++
      continue
    }

    console.log(`Looking up issue: ${identifier}...`)
    const issueId = await getIssueId(identifier.trim(), TEAM_KEY)
    if (!issueId) {
      console.error(`Issue not found: ${identifier}`)
      failCount++
      continue
    }

    console.log(`Updating ${identifier} to state "${stateName}"...`)
    try {
      const res = await updateIssueState(issueId, stateId)
      if (res?.success) {
        console.log(`✅ Updated ${identifier} -> ${stateName}`)
        successCount++
      } else {
        console.error(`❌ Failed to update ${identifier}: ${JSON.stringify(res)}`)
        failCount++
      }
    } catch (e) {
      console.error(`❌ Error updating ${identifier}: ${e.message}`)
      failCount++
    }
  }

  console.log(`\nSummary: ${successCount} succeeded, ${failCount} failed`)
  if (failCount > 0) {
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})


