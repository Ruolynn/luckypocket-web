/**
 * @file Get Linear Issue
 * @description Fetch issue details from Linear by identifier
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

async function getIssueByIdentifier(identifier: string) {
  const query = `
    query GetIssueByIdentifier($identifier: String!) {
      issue(id: $identifier) {
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
        project {
          id
          name
        }
        comments {
          nodes {
            id
            body
            createdAt
            user {
              name
              email
            }
          }
        }
        createdAt
        updatedAt
      }
    }
  `

  try {
    const data = await client.request<{
      issue: any
    }>(query, { identifier })

    return data.issue
  } catch (error: any) {
    // Try alternative query using identifier search
    const searchQuery = `
      query SearchIssues {
        issues(filter: { number: { eq: ${identifier.split('-')[1]} } }, first: 10) {
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
            project {
              id
              name
            }
            comments {
              nodes {
                id
                body
                createdAt
                user {
                  name
                  email
                }
              }
            }
            createdAt
            updatedAt
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
      console.error('❌ Failed to fetch issue:', searchError.message)
      throw searchError
    }
  }
}

async function main() {
  const identifier = process.argv[2] || 'ZES-108'

  console.log(`\n🔍 Fetching Linear issue: ${identifier}...\n`)

  try {
    const issue = await getIssueByIdentifier(identifier)

    console.log('✅ Issue found:\n')
    console.log(`📋 Identifier: ${issue.identifier}`)
    console.log(`📝 Title: ${issue.title}`)
    console.log(`🏷️  Team: ${issue.team.name} (${issue.team.key})`)
    console.log(`📊 State: ${issue.state.name} (${issue.state.type})`)
    console.log(`🔗 URL: ${issue.url}`)

    if (issue.assignee) {
      console.log(`👤 Assignee: ${issue.assignee.name} (${issue.assignee.email})`)
    }

    if (issue.priority !== undefined) {
      const priorities = ['No priority', 'Urgent', 'High', 'Medium', 'Low']
      console.log(`⚡ Priority: ${priorities[issue.priority] || issue.priority}`)
    }

    if (issue.labels?.nodes?.length > 0) {
      console.log(`🏷️  Labels: ${issue.labels.nodes.map((l: any) => l.name).join(', ')}`)
    }

    if (issue.project) {
      console.log(`📁 Project: ${issue.project.name}`)
    }

    console.log(`\n📄 Description:`)
    console.log('━'.repeat(60))
    console.log(issue.description || '(No description)')
    console.log('━'.repeat(60))

    console.log(`\n📅 Created: ${new Date(issue.createdAt).toLocaleString()}`)
    console.log(`📅 Updated: ${new Date(issue.updatedAt).toLocaleString()}`)

    // Display comments
    if (issue.comments?.nodes?.length > 0) {
      console.log(`\n💬 Comments (${issue.comments.nodes.length}):`)
      console.log('━'.repeat(60))
      issue.comments.nodes.forEach((comment: any, index: number) => {
        console.log(`\n[${index + 1}] ${comment.user.name} - ${new Date(comment.createdAt).toLocaleString()}`)
        console.log(comment.body)
        console.log('─'.repeat(60))
      })
    } else {
      console.log(`\n💬 Comments: None`)
    }

    console.log('\n✅ Done\n')
  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  }
}

main()
