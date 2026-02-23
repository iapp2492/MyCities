using Microsoft.AspNetCore.Mvc.Filters;
using Serilog.Context;

namespace MyCitiesWebApi.Filters
{
    public sealed class SerilogActionEnricherFilter : IAsyncActionFilter
    {
        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var controller = context.ActionDescriptor.RouteValues.TryGetValue("controller", out var c)
                ? c
                : null;

            var action = context.ActionDescriptor.RouteValues.TryGetValue("action", out var a)
                ? a
                : null;

            var traceId = context.HttpContext.TraceIdentifier;
            var requestPath = context.HttpContext.Request.Path.Value;

            using (LogContext.PushProperty("Controller", controller))
            using (LogContext.PushProperty("Action", action))
            using (LogContext.PushProperty("TraceId", traceId))
            using (LogContext.PushProperty("RequestPath", requestPath))
            {
                await next();
            }
        }
    }
}
