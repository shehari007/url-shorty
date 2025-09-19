import React from 'react';
import { ContactsOutlined } from '@ant-design/icons';
import Contact from '../Components/Contact/Contact';
import PageContainer from './PageContainer';

export default function ContactPage() {
  return (
    <PageContainer title="Contact Us" icon={<ContactsOutlined />}>
      <Contact />
    </PageContainer>
  );
}
