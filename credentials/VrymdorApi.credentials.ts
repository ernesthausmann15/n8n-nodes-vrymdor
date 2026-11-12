import type {
  IAuthenticateGeneric,
  ICredentialDataDecryptedObject,
  ICredentialTestRequest,
  ICredentialType,
  IHttpRequestHelper,
  INodeProperties,
} from 'n8n-workflow'

/**
 * A Vrymdor AI Node agent identity: the gateway's address plus the agent id and secret from the Vrymdor app
 * (AI agents, Register an agent). n8n trades the secret for a short-lived gateway token (preAuthentication)
 * and keeps that token in the hidden, expirable Session Token field; when the gateway answers 401, n8n
 * trades the secret again. n8n stores the credential encrypted like every other credential.
 */
export class VrymdorApi implements ICredentialType {
  name = 'vrymdorApi'
  displayName = 'Vrymdor AI Node API'
  documentationUrl = 'https://vrymdor.com/developers/connect'
  icon = { light: 'file:../nodes/Vrymdor/vrymdor.svg', dark: 'file:../nodes/Vrymdor/vrymdor.dark.svg' } as const
  properties: INodeProperties[] = [
    {
      // Shown as "Node Host URL" (the Mission Brief's field name); the key stays gatewayUrl so saved credentials work.
      displayName: 'Node Host URL',
      name: 'gatewayUrl',
      type: 'string',
      // Each account has its own hosted node address, so there is no one address that works for everyone. The
      // placeholder shows the hosted form; on n8n Cloud only a public https address works.
      default: '',
      required: true,
      placeholder: 'https://node.vrymdor.com/t/your-node-id',
      description: 'Your hosted node address: sign up free at https://vrymdor.com, start the 14 day Pro trial (or Pro, Business or Enterprise), then in the Vrymdor app open Home base, Hosted node, Turn on, and copy it from AI agents, Connect your AI Node, n8n. On n8n Cloud it must be a public https address; on self-hosted n8n your own node such as http://vrymdor-node:8080 also works.',
    },
    { displayName: 'Agent ID', name: 'agentId', type: 'string', default: '', required: true, placeholder: 'agt_3f9c2a7d1b8e4f60',
      description: 'From the Vrymdor app: AI agents, Register an agent' },
    {
      displayName: 'Agent Secret',
      name: 'agentSecret',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Shown once when the agent was registered (starts with vrym_agent_)',
    },
    {
      displayName: 'Session Token',
      name: 'sessionToken',
      type: 'hidden',
      typeOptions: { expirable: true, password: true },
      default: '',
    },
  ]

  async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
    const base = String(credentials.gatewayUrl).replace(/\/+$/, '')
    const out = (await this.helpers.httpRequest({
      method: 'POST',
      url: `${base}/v1/token`,
      body: { agent_id: credentials.agentId, agent_secret: credentials.agentSecret },
      json: true,
    })) as { access_token: string }
    return { sessionToken: out.access_token }
  }

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: { headers: { Authorization: '=Bearer {{$credentials.sessionToken}}' } },
  }

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.gatewayUrl}}',
      url: '/v1/token',
      method: 'POST',
      body: { agent_id: '={{$credentials.agentId}}', agent_secret: '={{$credentials.agentSecret}}' },
    },
  }
}
