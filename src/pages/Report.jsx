import React from 'react';
import { WarningOutlined } from '@ant-design/icons';
import ReportPage from '../Components/ReportPage/ReportPage';
import PageContainer from './PageContainer';

export default function Report() {
  return (
    <PageContainer title="Report Shorty Link" icon={<WarningOutlined />}>
      <ReportPage />
    </PageContainer>
  );
}
