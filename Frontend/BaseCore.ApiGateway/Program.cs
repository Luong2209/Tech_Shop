using Ocelot.DependencyInjection;
using Ocelot.Middleware;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

// Add Ocelot configuration
builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Add Ocelot
builder.Services.AddOcelot();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");

var webRootPath = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
if (Directory.Exists(webRootPath))
{
    app.UseDefaultFiles();
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(webRootPath)
    });

    app.Use(async (context, next) =>
    {
        var path = context.Request.Path;
        var isApiRequest = path.StartsWithSegments("/api");
        var isSwaggerRequest = path.StartsWithSegments("/swagger");
        var hasFileExtension = Path.HasExtension(path.Value);

        if (!isApiRequest && !isSwaggerRequest && !hasFileExtension)
        {
            context.Response.ContentType = "text/html; charset=utf-8";
            await context.Response.SendFileAsync(Path.Combine(webRootPath, "index.html"));
            return;
        }

        await next();
    });
}

// Ocelot must be last
await app.UseOcelot();

Console.WriteLine(@"
╔══════════════════════════════════════════════════════════════╗
║              BaseCore API Gateway                            ║
║══════════════════════════════════════════════════════════════║
║  Gateway:        http://localhost:5000                       ║
║  User Service:   http://localhost:5003                       ║
║  Product Service: http://localhost:5001                      ║
║  Order Service:  http://localhost:5002                       ║
╚══════════════════════════════════════════════════════════════╝
");

app.Run();
