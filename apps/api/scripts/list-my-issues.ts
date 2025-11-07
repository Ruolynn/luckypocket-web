/**
 * @file List My Linear Issues
 * @description List issues assigned to the current user
 */

import { GraphQLClient } from 'graphql-request'
import 'dotenv/config'

const LINEAR_API_URL = 'https://api.linear.app/graphql'
const LINEAR_API_KEY = process.env.LINEAR_API_KEY

if (!LINEAR_API_KEY) {
  console.error('❌ Error: LINEAR_API_KEY environment variable is not set')
  process.exit(1)
}

const client = new GraphQLClient(LINEAR_API_URL, {
  headers: {
    Authorization: LINEAR_API_KEY,
    'Content-Type': 'application/json',
  },
})

async function getCurrentUser() {
  const query = `
    query {
      viewer {
        id
        name
        email
      }
    }
  `

  try {
    const data = await client.request<{ viewer: any }>(query)
    return data.viewer
  } catch (error: any) {
    console.error('❌ Failed to fetch current user:', error.message)
    throw error
  }
}

async function listMyIssues(first: number = 100) {
  const query = `
    query ListMyIssues($first: Int!) {
      viewer {
        assignedIssues(first: $first, orderBy: updatedAt) {
          nodes {
            id
            identifier
            title
            description
            url
            state {
              id
              name
              type
            }
            team {
              id
              name
              key
            }
            priority
            createdAt
            updatedAt
          }
        }
      }
    }
  `

  try {
    const data = await client.request<{
      viewer: { assignedIssues: { nodes: any[] } }
    }>(query, { first })

    return data.viewer.assignedIssues.nodes
  } catch (error: any) {
    console.error('❌ Failed to fetch issues:', error.message)
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2))
    }
    throw error
  }
}

async function main() {
  try {
    console.log(`\n🔍 Fetching your information...\n`)

    const user = await getCurrentUser()
    console.log(`👤 User: ${user.name} (${user.email})`)
    console.log(`\n🔍 Fetching your assigned issues...\n`)

    const issues = await listMyIssues()

    if (issues.length === 0) {
      console.log('⚠️  No issues assigned to you')
      return
    }

    // Group by status
    const byStatus = {
      completed: issues.filter(i => i.state.type === 'completed'),
      started: issues.filter(i => i.state.type === 'started'),
      unstarted: issues.filter(i => i.state.type === 'unstarted'),
      backlog: issues.filter(i => i.state.type === 'backlog'),
      canceled: issues.filter(i => i.state.type === 'canceled'),
    }

    console.log(`✅ Found ${issues.length} issue(s) assigned to you:\n`)
    console.log('━'.repeat(100))

    const priorities = ['No priority', 'Urgent', 'High', 'Medium', 'Low']

    // Show in progress first
    if (byStatus.started.length > 0) {
      console.log(`\n🔄 IN PROGRESS (${byStatus.started.length}):\n`)
      for (const issue of byStatus.started) {
        const priority = issue.priority !== undefined ? priorities[issue.priority] : 'Unknown'
        console.log(`📋 ${issue.identifier}: ${issue.title}`)
        console.log(`   🏷️  Team: ${issue.team.name} (${issue.team.key})`)
        console.log(`   📊 State: ${issue.state.name}`)
        console.log(`   ⚡ Priority: ${priority}`)
        console.log(`   🔗 URL: ${issue.url}`)
        console.log(`   📅 Updated: ${new Date(issue.updatedAt).toLocaleString()}`)
        if (issue.description) {
          const preview = issue.description.slice(0, 150).replace(/\n/g, ' ')
          console.log(`   📄 ${preview}${issue.description.length > 150 ? '...' : ''}`)
        }
        console.log('')
      }
    }

    // Show todo/unstarted
    if (byStatus.unstarted.length > 0) {
      console.log(`\n📋 TODO (${byStatus.unstarted.length}):\n`)
      for (const issue of byStatus.unstarted) {
        const priority = issue.priority !== undefined ? priorities[issue.priority] : 'Unknown'
        console.log(`📋 ${issue.identifier}: ${issue.title}`)
        console.log(`   🏷️  Team: ${issue.team.name} (${issue.team.key})`)
        console.log(`   ⚡ Priority: ${priority}`)
        console.log(`   🔗 URL: ${issue.url}`)
        console.log(`   📅 Updated: ${new Date(issue.updatedAt).toLocaleString()}`)
        console.log('')
      }
    }

    // Show backlog
    if (byStatus.backlog.length > 0) {
      console.log(`\n📦 BACKLOG (${byStatus.backlog.length}):\n`)
      for (const issue of byStatus.backlog) {
        const priority = issue.priority !== undefined ? priorities[issue.priority] : 'Unknown'
        console.log(`📋 ${issue.identifier}: ${issue.title}`)
        console.log(`   ⚡ Priority: ${priority}`)
        console.log(`   🔗 URL: ${issue.url}`)
        console.log('')
      }
    }

    // Show completed
    if (byStatus.completed.length > 0) {
      console.log(`\n✅ COMPLETED (${byStatus.completed.length}):\n`)
      for (const issue of byStatus.completed) {
        console.log(`📋 ${issue.identifier}: ${issue.title}`)
        console.log(`   🔗 URL: ${issue.url}`)
        console.log(`   📅 Completed: ${new Date(issue.updatedAt).toLocaleString()}`)
        console.log('')
      }
    }

    console.log('━'.repeat(100))
    console.log(`\n📊 Summary:`)
    console.log(`   🔄 In Progress: ${byStatus.started.length}`)
    console.log(`   📋 Todo: ${byStatus.unstarted.length}`)
    console.log(`   📦 Backlog: ${byStatus.backlog.length}`)
    console.log(`   ✅ Completed: ${byStatus.completed.length}`)
    console.log(`   📝 Total: ${issues.length}\n`)

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

main()
