
import React, { useState } from 'react';
import { HomeFilled, DashboardFilled, GithubFilled, SettingFilled, CopyOutlined } from '@ant-design/icons';
import { Menu, Card, Input, Alert, Space, Spin, Tag, Button  } from 'antd';
import axios from 'axios';
import copy from 'copy-to-clipboard';

function DetailsCard() {


  return <>
   <div align="center">
      <Card
        style={{
          width: '85%',
          justifyItems: 'center',
          boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div align="left">
          <ul>
            <li>
                Submitting the link must include only https:// at start of string http:// links are not accepted
            </li>
          </ul>
          </div>
      </Card>
      </div>
  </>
}

export default DetailsCard;
