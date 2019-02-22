import mfh from 'make-fetch-happen'
import { writeFileSync } from 'fs'

function fetch() {}

const GITHUB_API = 'foobar'
const releaseQuery = {
  query:
    'query release {   repository(name: "vscode-go", owner: "Microsoft") {     releases(last: 1) {       nodes {         createdAt         tagName }     }   } }  query pullRequests {   repository(name: "vscode-go", owner: "Microsoft") {     pullRequests(states: MERGED, last: 10) {       nodes {         title         mergedAt         number         author {           login           ... on User {             name } }       }     }   } } ',
  variables: {},
  operationName: 'release',
}

const PRQuery = {
  query:
    'query release {   repository(name: "vscode-go", owner: "Microsoft") {\n    releases(last: 1) {\n      nodes {\n        createdAt\n        tagName\n      }\n    }\n  }\n}\n\nquery pullRequests {\n  repository(name: "vscode-go", owner: "Microsoft") {\n    pullRequests(states: MERGED, last: 50) {\n      nodes {     url    title         mergedAt         number         author { login ... on User {             name  url }         }       }     }   } } ',
  variables: {},
  operationName: 'pullRequests',
}

function filterRelease({ data, errors }) {
  if (errors) {
    throw new Error(`Error fetch PRs ${JSON.stringify(errors)}`)
  }

  const {
    repository: {
      releases: { nodes },
    },
  } = data

  return nodes[0]
}

function filterPRs({ data, errors }): PR[] {
  if (errors) {
    throw new Error(`Error fetch PRs ${JSON.stringify(errors)}`)
  }

  const {
    repository: {
      pullRequests: { nodes },
    },
  } = data

  return nodes
}

interface PR {
  title: string
  mergedAt: string
  number: number
  url: string
  author: {
    login: string
    name: string
  }
}

async function main() {
  const release = await fetch(GITHUB_API, releaseQuery).then(filterRelease)
  const prs = (await fetch(GITHUB_API, PRQuery).then(filterPRs)) as PR[]
  const releaseDate = new Date(release.createdAt)
  const newPrs = prs.filter(pr => {
    return releaseDate < new Date(pr.mergedAt)
  })

  const groupedPrs = newPrs.reduce(
    (memo, pr) => {
      const {
        author: { login },
      } = pr

      if (!memo[login]) {
        memo[login] = []
      }

      memo[login].push(pr)

      return memo
    },
    {} as { [key: string]: PR[] }
  )

  const userSections = Object.keys(groupedPrs)
    .map(login => {
      const header = ` * [@${login}](${url})\n`
      const userPRs = groupedPrs[login]
      const prsLines = userPRs.map(pr => `      * ${pr.title} [PR ${pr.number}](${pr.url})`).join('\n')
      return `${header}${prsLines}\n`
    })
    .join('\n')

  const changes = `## {nextVersion} - ${new Date().toISOString()}

### Uncategorized PRs
${userSections}
`
  writeFileSync(process.argv[0] || './changelog.md', changes)
}
