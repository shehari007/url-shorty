import React from 'react';
import { RiseOutlined } from '@ant-design/icons';
import PerLinkStat from '../Components/PerLinkStat/PerLinkStat';
import PageContainer from './PageContainer';

export default function PerLinkStats() {
  return (
    <PageContainer title="Per Link Stats" icon={<RiseOutlined />}>
      <PerLinkStat />
    </PageContainer>
  );
}
