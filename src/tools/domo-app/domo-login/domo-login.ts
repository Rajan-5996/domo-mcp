import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Represents the standard response format for all Domo login operations.
 */
export interface LoginResult {
    success: boolean;
    version?: string;
    error?: string;
    code?: number;
    designs?: string;
    stage?: string;
    instance?: string;
    message?: string;
    tokenAccepted?: boolean;
}

/**
 * Orchestrates Domo authentication via Developer Access Token.
 *
 * The original interactive (browser-based) login path is removed because
 * the MCP server runs headless — there is no TTY, no browser, and
 * `stdio: 'inherit'` has nothing to inherit. The skill doc (Set Up Domo AppDB)
 * shows the correct headless approach: authenticate every API call with
 * `X-DOMO-Developer-Token` header rather than a CLI session cookie.
 *
 * Token-based auth works for all Domo REST API calls and is the pattern
 * used by every curl command in the AppDB skill. The domo CLI itself is
 * only needed for `domo publish` — not for data-plane operations.
 */
export class DomoLoginTool {

    private domoBinPath: string = 'domo';

    /**
     * Checks whether the `domo` CLI is accessible and retrieves its version string.
     */
    async checkDomoVersion(): Promise<LoginResult> {
        try {
            const { stdout } = await execAsync('domo --version');
            return { success: true, version: stdout.trim() };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Installs the `domo` CLI globally via npm (`ryuu` package) if not present.
     */
    async installDomo(): Promise<LoginResult> {
        try {
            await execAsync('npm install -g ryuu');

            const { stdout: binPath } = await execAsync(
                'which domo 2>/dev/null || npx --no which domo 2>/dev/null || echo ""'
            );
            const resolved = binPath.trim();
            if (resolved) {
                this.domoBinPath = resolved;
            }

            const { stdout: version } = await execAsync(`${this.domoBinPath} --version`);
            return { success: true, version: version.trim() };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    /**
     * Validates the Developer Access Token by hitting a lightweight Domo REST
     * endpoint (`GET /api/datastores/v1`) with the token in the header.
     *
     * This replaces the old `loginInteractive` / `loginNonInteractive` methods.
     * The MCP server is headless — no TTY, no browser. The `domo login -i` command
     * requires an interactive terminal to open a browser tab and receive a redirect,
     * which is impossible here. Token-based auth is the correct pattern for all
     * server-side / CI contexts, as documented in the AppDB skill.
     *
     * @param instanceName - Domo instance hostname, e.g. `gwcteq-partner.domo.com`
     * @param devToken     - Developer Access Token from Domo Admin → Authentication → Access Tokens
     */
    async loginWithToken(instanceName: string, devToken: string): Promise<LoginResult> {
        const baseUrl = `https://${instanceName}`;

        try {
            const { stdout } = await execAsync(
                `curl --silent --fail --show-error \
                  --request GET "${baseUrl}/api/datastores/v1" \
                  --header "Content-Type: application/json" \
                  --header "X-DOMO-Developer-Token: ${devToken}"`
            );

            const parsed = JSON.parse(stdout || '[]');
            return {
                success: true,
                tokenAccepted: true,
                designs: JSON.stringify(parsed, null, 2),
            };
        } catch (error) {
            const msg = (error as Error).message;

            if (msg.includes('401')) {
                return {
                    success: false,
                    error: 'Token rejected (401 Unauthorized). Regenerate from Domo → Admin Settings → Authentication → Access Tokens.',
                };
            }
            if (msg.includes('403')) {
                return {
                    success: false,
                    error: 'Token forbidden (403). The token must belong to an admin-level account.',
                };
            }
            return { success: false, error: msg };
        }
    }

    /**
     * Executes the complete Domo login workflow:
     *
     * 1. **CLI check** — verifies `domo` is available; installs `ryuu` if absent.
     *    (CLI is only needed for `domo publish` later; not for token-auth API calls.)
     * 2. **Token validation** — hits `GET /api/datastores/v1` with the dev token to
     *    confirm the instance is reachable and the token is accepted.
     *
     * Non-interactive (browser) login is intentionally removed. The MCP server
     * has no TTY — `spawn('domo', ['login', '-i', ...], { stdio: 'inherit' })` will
     * always fail with `spawn domo ENOENT` or hang waiting for a terminal that never
     * comes. Token-based auth is the correct and only viable path here.
     *
     * @param instanceName - Domo instance hostname (e.g. `gwcteq-partner.domo.com`)
     * @param devToken     - Developer Access Token (required)
     */
    async completeLoginFlow(
        instanceName: string,
        devToken: string
    ): Promise<LoginResult> {

        const versionCheck = await this.checkDomoVersion();
        if (!versionCheck.success) {
            const installResult = await this.installDomo();
            if (!installResult.success) {
                return { success: false, stage: 'installation', error: installResult.error };
            }
        }

        const tokenResult = await this.loginWithToken(instanceName, devToken);
        if (!tokenResult.success) {
            return { success: false, stage: 'token-validation', error: tokenResult.error };
        }

        return {
            success: true,
            instance: instanceName,
            tokenAccepted: true,
            message: 'Authenticated via Developer Access Token. Ready to make Domo API calls.',
            designs: tokenResult.designs,
        };
    }
}

/**
 * Primary entry point for the `domo_login` MCP tool handler.
 *
 * **Breaking change from original:** `client_id` / `client_secret` are replaced
 * by `dev_token`. The old OAuth client flow required a running auth server and
 * redirect URI — neither of which is available in a headless MCP context.
 * A Developer Access Token is simpler, just as secure, and is exactly what the
 * AppDB skill uses for every REST call.
 *
 * @param params.instance_name - Domo hostname, e.g. `gwcteq-partner.domo.com`
 * @param params.dev_token     - Developer Access Token from Domo Admin → Authentication → Access Tokens
 *
 * @agent
 *   COLLECT FROM USER BEFORE INVOKING:
 *   - `instance_name` — "Which Domo instance? (e.g., company.domo.com)"
 *   - `dev_token`     — "Please provide your Domo Developer Access Token.
 *                        Generate one at: Domo → Admin Settings → Authentication → Access Tokens."
 *
 *   SUGGESTED FOLLOW-UPS AFTER SUCCESS:
 *   - Do run in terminal or in bash `domo ls`
 */
export async function domoLogin(params: {
    instance_name: string;
    dev_token: string;
}): Promise<LoginResult> {
    const { instance_name, dev_token } = params;

    if (!instance_name) {
        return { success: false, error: 'instance_name is required (e.g., company.domo.com)' };
    }
    if (!dev_token) {
        return {
            success: false,
            error: 'dev_token is required. Generate one at: Domo → Admin Settings → Authentication → Access Tokens.',
        };
    }

    const tool = new DomoLoginTool();
    return tool.completeLoginFlow(instance_name, dev_token);
}
