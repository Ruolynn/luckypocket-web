/**
 * @file Get Linear Issue Details
 * @description Get detailed information for a specific Linear issue
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

async function getIssueDetails(issueId: string) {
  const query = `
    query GetIssue($issueId: String!) {
      issue(id: $issueId) {
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
        assignee {
          id
          name
          email
        }
        priority
        labels {
          nodes {
            id
            name
          }
        }
        createdAt
        updatedAt
      }
    }
  `

  try {
    const data = await client.request<{ issue: any }>(query, { issueId })
    return data.issue
  } catch (error: any) {
    console.error('❌ Failed to fetch issue:', error.message)
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2))
    }
    throw error
  }
}

async function main() {
  const issueIdentifier = process.argv[2] // e.g., "ZES-77"

  if (!issueIdentifier) {
    console.error('Usage: tsx get-issue-details.ts ZES-77')
    process.exit(1)
  }

  console.log(`\n🔍 Fetching details for ${issueIdentifier}...\n`)

  try {
    const issue = await getIssueDetails(issueIdentifier)

    if (!issue) {
      console.log('⚠️  Issue not found')
      return
    }

    const priorities = ['No priority', 'Urgent', 'High', 'Medium', 'Low']
    const priority = issue.priority !== undefined ? priorities[issue.priority] : 'Unknown'

    console.log('━'.repeat(100))
    console.log(`\n📋 ${issue.identifier}: ${issue.title}\n`)
    console.log(`🏷️  Team: ${issue.team.name} (${issue.team.key})`)
    console.log(`📊 State: ${issue.state.name} (${issue.state.type})`)
    console.log(`⚡ Priority: ${priority}`)

    if (issue.assignee) {
      console.log(`👤 Assignee: ${issue.assignee.name} (${issue.assignee.email})`)
    }

    if (issue.labels.nodes.length > 0) {
      const labels = issue.labels.nodes.map((l: any) => l.name).join(', ')
      console.log(`🏷  Labels: ${labels}`)
    }

    console.log(`\n🔗 URL: ${issue.url}`)
    console.log(`📅 Created: ${new Date(issue.createdAt).toLocaleString()}`)
    console.log(`📅 Updated: ${new Date(issue.updatedAt).toLocaleString()}`)

    if (issue.description) {
      console.log(`\n📄 Description:\n`)
      console.log('─'.repeat(100))
      console.log(issue.description)
      console.log('─'.repeat(100))
    }

    console.log('\n')
  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

main()
