export default function Settings() {
  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Application preferences and global configuration.</p>
      </div>
      
      <div className="border rounded-md bg-card p-12 text-center">
        <h3 className="text-lg font-medium text-card-foreground">Global Settings Placeholder</h3>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          System-wide settings such as user management, template configuration for mail merges, and API integrations will be available here in a future update.
        </p>
      </div>
    </div>
  );
}
