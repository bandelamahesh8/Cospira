import { Outlet } from 'react-router-dom';
import { PageLayout } from '../PageLayout';

const RootLayout = () => {
  return (
    <PageLayout showNavbar showSidebar className='p-0'>
      <Outlet />
    </PageLayout>
  );
};

export default RootLayout;
