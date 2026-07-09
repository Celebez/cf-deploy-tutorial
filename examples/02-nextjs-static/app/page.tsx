export default function Home() {
  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold text-primary mb-4">
        Next.js on Cloudflare Pages
      </h1>
      <p className="text-lg mb-6">
        Static export via <code className="bg-card px-2 py-1 rounded">output: &apos;export&apos;</code>.
        Tailwind v4 dengan <code className="bg-card px-2 py-1 rounded">@theme</code> directive.
      </p>

      <div className="bg-card border border-border rounded-lg p-6 mt-8">
        <h2 className="text-xl font-semibold mb-2">Features</h2>
        <ul className="space-y-2 text-sm">
          <li>✅ Static site generation (SSG)</li>
          <li>✅ Tailwind CSS v4 (no config file)</li>
          <li>✅ Zero server runtime needed</li>
          <li>✅ Deployed to 300+ edge locations</li>
        </ul>
      </div>

      <p className="mt-8 text-sm opacity-70">
        Source:{" "}
        <a href="https://github.com/Celebez/cf-deploy-tutorial" className="text-primary underline">
          cf-deploy-tutorial
        </a>
      </p>
    </main>
  );
}
