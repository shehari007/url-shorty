import React, { useEffect, useState } from 'react';
import {  HeartTwoTone, ThunderboltTwoTone } from '@ant-design/icons';
import { Card, Col, Row, Statistic } from 'antd';
import CountUp from 'react-countup';
import axios from 'axios';
const DetailsCard = () => {
  const formatter = (value) => <CountUp end={value} separator="," />;
  const [getStats, setGetStats] = useState([{total_shorty: 0, total_clicked: 0}]);
  const [HTTPError, setHTTPError] = useState(200);
  useEffect(() => {
    const getStats = async () => {
      try {

        const data = await axios.get(process.env.REACT_APP_API_STATS_URL, {

        });
        console.log(data.data[0])
        if (data.status === 200) {
          setGetStats(data.data[0]);
        }
      } catch (error) {
        if (error.response.status === 500) {
          setHTTPError(500);
        }
      }
    }
    getStats();
  }, [])
  return (
    <Row gutter={8} style={{ justifyContent: 'center' }}>
      <Col span={12} style={{ minWidth: '100%' }}>
        <Card
          style={{

            boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)'
          }}>
          <Statistic
            title="Total Shorty Generated"
            value={getStats.total_shorty}
            formatter={formatter}
            //precision={2}
            valueStyle={{
              color: 'green',
              fontWeight: 'bold',
            }}
            prefix={<HeartTwoTone twoToneColor="green" />}
          //suffix="%"
          />
        </Card>
      </Col>
      <Col span={12} style={{ minWidth: '100%', marginTop: '15px' }}>
        <Card style={{

          boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <Statistic
            title="Total Shorty Clicked"
            value={getStats.total_clicked}
            formatter={formatter}
            // precision={2}
            valueStyle={{
              color: 'red',
              fontWeight: 'bold',
            }}
            prefix={<ThunderboltTwoTone twoToneColor="red" />}
          // suffix="%"
          />
        </Card>
      </Col>

    </Row>

  );
}


export default DetailsCard;