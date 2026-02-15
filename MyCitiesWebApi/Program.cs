using MyCitiesDataAccess;
using Serilog;
using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using MyCitiesDataAccess.Contexts;

namespace MyCitiesWebApi
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            #region Host Configuration

            builder.Host.UseSerilog((ctx, lc) =>
                                    lc.ReadFrom.Configuration(ctx.Configuration));

            #endregion


            #region Service Registration


            #region Framework Services


            builder.Services.AddControllers();

            // Swagger (Development only at runtime, but registration is fine always)
            builder.Services.AddEndpointsApiExplorer(); // Collects metadata about every endpoint contained in the app
            builder.Services.AddSwaggerGen(); // “When someone requests /swagger/v1/swagger.json, dynamically generate an OpenAPI document describing the API.”

            //CORS policies
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowAnyOrigin", p =>
                    p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

                options.AddPolicy("AllowOnlyMyCities", p =>
                    p.WithOrigins("https://www.mycities.example") // change later after deployment
                     .AllowAnyMethod()
                     .AllowAnyHeader());
            });

            #endregion

            #region Application Service


            // ***************************************************************************//

            // The following will load the data for this application from the Excel file 
            // This was used during initial development but has now been replaced by
            // the EF-based service that reads from the SQL database.
            // builder.Services.Configure<MyCitiesDataOptions>(
            // builder.Configuration.GetSection("MyCitiesData"));
            // builder.Services.AddSingleton<IMyCitiesDataService>(sp =>
            // {
            //    var env = sp.GetRequiredService<IWebHostEnvironment>();
            //    var opts = sp.GetRequiredService<IOptions<MyCitiesDataOptions>>().Value;
            //    var logger = sp.GetRequiredService<ILogger<ExcelMyCitiesDataService>>();

            //    var fullPath = Path.Combine(env.ContentRootPath, opts.ExcelFilePath);

            //    return new ExcelMyCitiesDataService(fullPath, opts.WorksheetName, logger);
            // });

            // ***************************************************************************//

            //DataAccess 
            builder.Services.AddDbContext<MyCitiesDbContext>(options =>
            {
                options.UseSqlServer(builder.Configuration.GetConnectionString("MyCities"));
            });

            builder.Services.AddScoped<IMyCitiesDataService, EfMyCitiesDataService>();


            #endregion


            #endregion

            #region Middleware Pipeline

            var app = builder.Build();

            app.UseSerilogRequestLogging();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI(c =>
                {
                    c.SwaggerEndpoint("/swagger/v1/swagger.json", "MyCities API v1");
                    c.RoutePrefix = "swagger"; // default; swagger UI at /swagger
                });
            }

            app.UseHttpsRedirection();

            app.UseAuthorization();

            app.UseCors();

            app.MapControllers();

            // Open Swagger UI automatically in development mode
            if (app.Environment.IsDevelopment())
            {
                app.Lifetime.ApplicationStarted.Register(() =>
                {
                    var url = app.Urls.FirstOrDefault() ?? "https://localhost:5001";
                    var swaggerUrl = $"{url.TrimEnd('/')}/swagger";

                    try
                    {
                        Process.Start(new ProcessStartInfo
                        {
                            FileName = swaggerUrl,
                            UseShellExecute = true
                        });
                    }
                    catch
                    {
                        // ignore
                    }
                });
            }


            app.Run();

            #endregion
        }

    }
}
