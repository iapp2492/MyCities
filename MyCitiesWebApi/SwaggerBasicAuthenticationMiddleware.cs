using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Text;

namespace MyCitiesWebApi
{
    // Because production Swagger is an important deployment and debugging tool for this application,
    // I have chosen to allow it to remain enabled but protected with authentication
    // rather than restricting it to the Development environment.
    public class SwaggerBasicAuthenticationMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly SwaggerAuthenticationSettings _settings;

        public SwaggerBasicAuthenticationMiddleware(
            RequestDelegate next,
            IOptions<SwaggerAuthenticationSettings> settings)
        {
            _next = next;
            _settings = settings.Value;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // This middleware protects Swagger and any call to the Debugging Controller.
            // All other MyCities requests continue through the pipeline normally.
            // Protect the Swagger UI, the OpenAPI document, and all supporting
            // Swagger resources (CSS, JavaScript, etc.).

            bool requiresAuthentication =
                context.Request.Path.StartsWithSegments("/swagger") ||
                context.Request.Path.StartsWithSegments("/api/debugging");

            if (!requiresAuthentication)
            {
                await _next(context);
                return;
            }

            if (IsAuthorized(context.Request))
            {
                await _next(context);
                return;
            }

            // This header causes the browser to display its standard
            // username/password dialog.
            context.Response.Headers.WWWAuthenticate =
                "Basic realm=\"MyCities Swagger\"";

            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsync("Unauthorized");
        }

        private bool IsAuthorized(HttpRequest request)
        {
            string authorizationHeader = request.Headers.Authorization.ToString();

            if (string.IsNullOrWhiteSpace(authorizationHeader))
            {
                return false;
            }

            if (!AuthenticationHeaderValue.TryParse(
                    authorizationHeader,
                    out AuthenticationHeaderValue? headerValue))
            {
                return false;
            }

            if (!string.Equals(
                    headerValue.Scheme,
                    "Basic",
                    StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (string.IsNullOrWhiteSpace(headerValue.Parameter))
            {
                return false;
            }

            try
            {
                byte[] credentialBytes =
                    Convert.FromBase64String(headerValue.Parameter);

                string credentials = Encoding.UTF8.GetString(credentialBytes);

                // Split only on the first colon, allowing the password itself
                // to contain additional colon characters.
                string[] parts = credentials.Split(':', 2);

                if (parts.Length != 2)
                {
                    return false;
                }

                string suppliedUsername = parts[0];
                string suppliedPassword = parts[1];

                return string.Equals(
                            suppliedUsername,
                            _settings.Username,
                            StringComparison.Ordinal) &&
                        string.Equals(
                            suppliedPassword,
                            _settings.Password,
                            StringComparison.Ordinal);
            }
            catch (FormatException)
            {
                // The credentials were not valid Base64.
                return false;
            }
        }
    }
}
