import React, { useState } from 'react';
import { Card, Col, Row, Input, Alert, Statistic } from 'antd';
import { LinkOutlined, SafetyCertificateTwoTone, ClockCircleTwoTone, ThunderboltTwoTone, CrownTwoTone } from '@ant-design/icons';
import axios from 'axios';
import CountUp from 'react-countup';
const { Search } = Input;
const PerLinkStat = () => {

    const [HTTPError, setHTTPError] = useState(100);
    // const [Loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [urlValue, setUrlValue] = useState('');

    const onSubmit = async (event) => {
        // event.preventDefault();
        //setResponse(() => false);
        // setCopied(() => false);
        setHTTPError(200);
        try {
            //setLoading(true);
            const data = await axios.post(process.env.REACT_APP_API_PER_LINK_STATS, {
                urlValue: urlValue
            });

            if (data.status === 200) {
                // setLoading(false);
                var res = data.data[0];
                setStats(res);
            }
        } catch (error) {
            if (error.response.status === 400) {
                // setLoading(false);
                setHTTPError(400);
            }
        }
    };
    const formatter = (value) => <CountUp end={value} separator="," />;

    return (
        <><Row gutter={8} style={{ justifyContent: 'center' }}>
            <Col span={24} style={{ minWidth: '100%' }}>
                <Card
                    style={{
                        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                    <h2>Per Shorty Link Stats</h2>
                    <Search
                        style={{ maxWidth: '95%' }}
                        placeholder="Enter your Shorty URL here.."
                        allowClear
                        onChange={e => setUrlValue(e.target.value)}
                        prefix={<LinkOutlined />}
                        enterButton="Submit"
                        size="large"
                        onSearch={onSubmit} />

                    {HTTPError === 400 ?
                        <Alert
                            message={<><p>Only HTTPS Links are allowed, Make sure your link starts with https://<br />Or entered URL is not a valid URL</p></>}
                            type="error"
                            showIcon
                            closable
                            style={{ textAlign: 'center', maxWidth: '95%', marginTop: '2%' }}

                        /> : null}
                </Card>
            </Col>
        </Row>
            <br /><br />
            <Row gutter={8} style={{ justifyContent: 'center' }}>
                <Col span={6} style={{ minWidth: '100%' }}>
                    <Card
                        style={{

                            boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)'
                        }}>
                        <Statistic
                            title="Times Clicked"
                            value={stats ? stats.times_clicked : 0}
                            formatter={formatter}
                            //precision={2}
                            valueStyle={{
                                color: 'red',
                                fontWeight: 'bold',
                            }}
                            prefix={<ThunderboltTwoTone twoToneColor="red" />}
                        />
                    </Card>
                </Col>
                <Col span={6} style={{ minWidth: '100%', marginTop: '15px' }}>
                    <Card style={{

                        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div align="center" style={{ color: 'gray' }}>Time Generated</div>
                        <div align="center" ><h2 style={{ color: 'orange' }}><ClockCircleTwoTone twoToneColor="orange" /> {stats ? stats.time_issued : '--'}</h2></div>
                    </Card>
                </Col>
                <Col span={6} style={{ minWidth: '100%', marginTop: '15px' }}>
                    <Card style={{

                        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div align="center" style={{ color: 'gray' }}>Reported OR Blacklisted?</div>
                        <div align="center"><h2 style={{ color: stats && stats.blacklisted === 0 ? 'green' : 'red' }}><SafetyCertificateTwoTone twoToneColor={stats && stats.blacklisted === 0 ? 'green' : 'red'} /> {stats && stats.blacklisted === 0 ? 'NO' : stats && stats.blacklisted === 1 ? 'YES' : '--'}</h2></div>
                    </Card>
                </Col>
                <Col span={6} style={{ minWidth: '100%', marginTop: '15px' }}>
                    <Card style={{

                        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div align="center" style={{ color: 'gray' }}>Expired?</div>
                        <div align="center"><h2 style={{ color: stats && stats.expired_status === 0 ? 'green' : 'red' }}><SafetyCertificateTwoTone twoToneColor={stats && stats.expired_status === 0 ? 'green' : 'red'} /> {stats && stats.expired_status === 0 ? 'NO' : stats && stats.expired_status === 1 ? 'YES' : '--'}</h2></div>
                    </Card>
                </Col>
                <Col span={6} style={{ minWidth: '100%', marginTop: '15px' }}>
                    <Card style={{

                        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div align="center" style={{ color: 'gray' }}>Main URL Length</div>
                        <div align="center"><h2 style={{ color: 'purple' }}><CrownTwoTone twoToneColor="purple" /> {stats ? stats.main_url.length : '--'}</h2></div>
                    </Card>
                </Col>
            </Row>

        </>
    );
}


export default PerLinkStat;