const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
}

export default async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).json('', { headers })
  }

  const deployId = process.env.DEPLOY_ID || 'unknown'
  const context = process.env.CONTEXT || 'unknown'
  const branch = process.env.BRANCH || process.env.HEAD || 'unknown'
  const commitRef = process.env.COMMIT_REF || 'unknown'

  return res.json({
    version: deployId,
    fullHash: deployId,
    context: context,
    branch: branch,
    commitRef: commitRef
  }, { status: 200, headers })
}
