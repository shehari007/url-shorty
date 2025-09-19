import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

export default function PageContainer({ title, icon, children, extra }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 16px' }}>
      <div style={{ width: '100%', maxWidth: 1100 }}>
        {title ? (
          <Title level={2} style={{ margin: '12px 8px' }}>
            {icon ? <span style={{ marginRight: 8 }}>{icon}</span> : null}
            {title}
          </Title>
        ) : null}
        <Card
          bodyStyle={{ padding: 24 }}
          style={{ boxShadow: '0px 6px 18px rgba(0,0,0,0.06)', borderRadius: 12 }}
          title={extra ? undefined : null}
          extra={extra}
        >
          {children}
        </Card>
      </div>
    </div>
  );
}
