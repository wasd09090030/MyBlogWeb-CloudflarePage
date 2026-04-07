using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BlogApi.Services;

namespace BlogApi.Controllers
{
    [ApiController]
    [Route("api/ops")]
    [Authorize(Roles = "Admin")]
    public class OpsController : ControllerBase
    {
        private readonly CloudflarePagesDeployService _cloudflarePagesDeployService;

        /// <summary>
        /// 初始化运维控制器，注入 Cloudflare Pages 部署服务。
        /// </summary>
        public OpsController(CloudflarePagesDeployService cloudflarePagesDeployService)
        {
            _cloudflarePagesDeployService = cloudflarePagesDeployService;
        }

        /// <summary>
        /// 手动触发 Cloudflare Pages Deploy Hook。
        /// </summary>
        [HttpPost("pages/deploy-hook")]
        public async Task<IActionResult> TriggerPagesDeployHook(CancellationToken cancellationToken)
        {
            var result = await _cloudflarePagesDeployService.TriggerDeployAsync(cancellationToken);
            if (!result.Success)
            {
                return StatusCode((int)result.StatusCode, new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message
            });
        }
    }
}
