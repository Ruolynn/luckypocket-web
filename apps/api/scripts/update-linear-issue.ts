/**
 * @file Update Linear Issue
 * @description Update Linear issue status and add comments
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

async function updateIssueStatus(issueId: string, stateId: string) {
  const mutation = `
    mutation UpdateIssue($issueId: String!, $stateId: String!) {
      issueUpdate(id: $issueId, input: { stateId: $stateId }) {
        success
        issue {
          id
          identifier
          title
          state {
            id
            name
          }
        }
      }
    }
  `

  try {
    const data = await client.request<{
      issueUpdate: {
        success: boolean
        issue: any
      }
    }>(mutation, { issueId, stateId })

    return data.issueUpdate
  } catch (error: any) {
    console.error('❌ Failed to update issue:', error.message)
    throw error
  }
}

async function addComment(issueId: string, comment: string) {
  const mutation = `
    mutation CreateComment($issueId: String!, $body: String!) {
      commentCreate(input: { issueId: $issueId, body: $body }) {
        success
        comment {
          id
          body
        }
      }
    }
  `

  try {
    const data = await client.request<{
      commentCreate: {
        success: boolean
        comment: any
      }
    }>(mutation, { issueId, body: comment })

    return data.commentCreate
  } catch (error: any) {
    console.error('❌ Failed to add comment:', error.message)
    throw error
  }
}

async function getWorkflowStates(teamId: string) {
  const query = `
    query GetWorkflowStates($teamId: String!) {
      team(id: $teamId) {
        states {
          nodes {
            id
            name
            type
          }
        }
      }
    }
  `

  try {
    const data = await client.request<{
      team: {
        states: {
          nodes: Array<{ id: string; name: string; type: string }>
        }
      }
    }>(query, { teamId })

    return data.team.states.nodes
  } catch (error: any) {
    console.error('❌ Failed to get workflow states:', error.message)
    throw error
  }
}

async function getIssueByIdentifier(identifier: string) {
  const query = `
    query GetIssue($identifier: String!) {
      issue(id: $identifier) {
        id
        identifier
        title
        state {
          id
          name
          type
        }
        team {
          id
          name
        }
      }
    }
  `

  try {
    const data = await client.request<{
      issue: any
    }>(query, { identifier })

    return data.issue
  } catch (error: any) {
    // Try searching by identifier
    const searchQuery = `
      query SearchIssues {
        issues(filter: { number: { eq: ${identifier.split('-')[1]} } }, first: 10) {
          nodes {
            id
            identifier
            title
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
          }
        }
      }
    `

    try {
      const searchData = await client.request<{
        issues: { nodes: any[] }
      }>(searchQuery)

      const issue = searchData.issues.nodes.find((i) => i.identifier === identifier)
      if (!issue) {
        throw new Error(`Issue ${identifier} not found`)
      }

      return issue
    } catch (searchError: any) {
      console.error('❌ Failed to find issue:', searchError.message)
      throw searchError
    }
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.error('❌ Error: Missing arguments\n')
    console.log('Usage:')
    console.log('  tsx scripts/update-linear-issue.ts <issue-identifier> <status-name> [comment]\n')
    console.log('Example:')
    console.log('  tsx scripts/update-linear-issue.ts ZES-114 "In Review" "PR ready for review"\n')
    process.exit(1)
  }

  const [identifier, statusName, comment] = args

  console.log(`\n🔄 Updating Linear issue: ${identifier}...\n`)

  try {
    // Get issue details
    console.log('📋 Fetching issue details...')
    const issue = await getIssueByIdentifier(identifier)

    console.log(`✅ Found: ${issue.identifier} - ${issue.title}`)
    console.log(`   Current state: ${issue.state.name} (${issue.state.type})`)
    console.log(`   Team: ${issue.team.name}\n`)

    // Get workflow states for the team
    console.log('🔍 Fetching workflow states...')
    const states = await getWorkflowStates(issue.team.id)

    // Find the target state
    const targetState = states.find(
      (s) => s.name.toLowerCase() === statusName.toLowerCase()
    )

    if (!targetState) {
      console.error(`❌ State "${statusName}" not found`)
      console.log('\nAvailable states:')
      states.forEach((s) => console.log(`  - ${s.name} (${s.type})`))
      process.exit(1)
    }

    // Update issue status
    console.log(`📝 Updating status to "${targetState.name}"...`)
    const updateResult = await updateIssueStatus(issue.id, targetState.id)

    if (updateResult.success) {
      console.log(`✅ Status updated: ${issue.state.name} → ${targetState.name}\n`)
    } else {
      console.error('❌ Failed to update status')
      process.exit(1)
    }

    // Add comment if provided
    if (comment) {
      console.log('💬 Adding comment...')
      const commentResult = await addComment(issue.id, comment)

      if (commentResult.success) {
        console.log('✅ Comment added\n')
      } else {
        console.error('❌ Failed to add comment')
      }
    }

    console.log('✅ Done\n')
  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

main()
