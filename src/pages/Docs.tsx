import Navbar from '@/components/Navbar';

const Docs = () => {
  return (
    <div className='min-h-screen bg-background'>
      <Navbar />
      <div className='container pb-10 pt-32'>
        <h1 className='text-4xl font-bold mb-6'>Documentation</h1>
        <div className='prose dark:prose-invert max-w-none'>
          <p className='text-xl text-muted-foreground mb-8'>
            Learn how to use ShareUs Cloud Rooms securely and efficiently.
          </p>

          <div className='grid gap-8 md:grid-cols-2'>
            <div className='p-6 border rounded-lg bg-card'>
              <h2 className='text-2xl font-semibold mb-4'>Getting Started</h2>
              <ul className='list-disc list-inside space-y-2 text-muted-foreground'>
                <li>Creating an account</li>
                <li>Starting your first room</li>
                <li>Inviting participants</li>
                <li>Room settings and security</li>
              </ul>
            </div>

            <div className='p-6 border rounded-lg bg-card'>
              <h2 className='text-2xl font-semibold mb-4'>Features</h2>
              <ul className='list-disc list-inside space-y-2 text-muted-foreground'>
                <li>Real-time encrypted chat</li>
                <li>Secure file sharing</li>
                <li>Password-protected rooms</li>
                <li>Ephemeral sessions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Docs;
