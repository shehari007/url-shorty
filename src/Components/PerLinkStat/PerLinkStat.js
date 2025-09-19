import React, { useState } from 'react';
import { Card, Col, Row, Input, Alert, Statistic, Descriptions, Tag } from 'antd';
import { LinkOutlined, SafetyCertificateTwoTone, ClockCircleTwoTone, ThunderboltTwoTone, CrownTwoTone } from '@ant-design/icons';
import axios from 'axios';
import CountUp from 'react-countup';
const { Search } = Input;
const PerLinkStat = () => {

    const [HTTPError, setHTTPError] = useState(100);
    // const [Loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [urlValue, setUrlValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [inputError, setInputError] = useState(null); // add

    const onSubmit = async () => {
        // basic empty validation
        if (!urlValue || urlValue.trim().length === 0) {
            setInputError('Please enter your Shorty URL');
            return;
        }
        setInputError(null);
        setHTTPError(200);
        try {
            setLoading(true);
            const data = await axios.post(process.env.REACT_APP_API_PER_LINK_STATS, {
                urlValue: urlValue
            });

            if (data.status === 200) {
                var res = data.data[0];
                setStats(res);
            }
        } catch (error) {
            if (error?.response?.status === 400) {
                setHTTPError(400);
            } else {
                setHTTPError(500);
            }
        } finally {
            setLoading(false);
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
                    <Input.Search
                        style={{ maxWidth: '95%' }}
                        placeholder="Enter your Shorty URL here.."
                        allowClear
                        onChange={e => {
                            setUrlValue(e.target.value);
                            if (inputError) setInputError(null);
                        }}
                        prefix={<LinkOutlined />}
                        enterButton="Submit"
                        required
                        
                        size="large"
                        onSearch={onSubmit}
                        loading={loading}
                        status={inputError ? 'error' : undefined}
                        />

                    {inputError ? (
                        <Alert
                            message={inputError}
                            type="error"
                            showIcon
                            closable
                            style={{ textAlign: 'left', maxWidth: '95%', marginTop: '12px' }}
                            onClose={() => setInputError(null)}
                        />
                    ) : null}

                    {HTTPError === 400 ?
                        <Alert
                            message={<><p>Only HTTPS Links are allowed, Make sure your link starts with https://<br />Or entered URL is not a valid URL</p></>}
                            type="error"
                            showIcon
                            closable
                            style={{ textAlign: 'center', maxWidth: '95%', marginTop: '12px' }}

                        /> : null}

                    {/* Compact stats layout */}
                    <Row gutter={0} style={{ justifyContent: 'center', marginTop: 16 }}>
                        <Col span={24}>
                            <Descriptions
                                bordered
                                size="small"
                                layout="vertical"
                                column={{ xs: 1, sm: 2, md: 3, lg: 5, xl: 5 }}
                            >
                                <Descriptions.Item label="Times Clicked">
                                    <Statistic
                                        value={stats ? stats.times_clicked : 0}
                                        formatter={formatter}
                                        valueStyle={{ color: 'red', fontWeight: 'bold' }}
                                        prefix={<ThunderboltTwoTone twoToneColor="red" />}
                                    />
                                </Descriptions.Item>

                                <Descriptions.Item label="Time Generated">
                                    <span style={{ color: 'orange' }}>
                                        <ClockCircleTwoTone twoToneColor="orange" /> {stats ? stats.time_issued : '--'}
                                    </span>
                                </Descriptions.Item>

                                <Descriptions.Item label="Reported / Blacklisted">
                                    {stats ? (
                                        stats.blacklisted === 0 ? (
                                            <Tag color="green">
                                                <SafetyCertificateTwoTone twoToneColor="green" /> NO
                                            </Tag>
                                        ) : (
                                            <Tag color="red">
                                                <SafetyCertificateTwoTone twoToneColor="red" /> YES
                                            </Tag>
                                        )
                                    ) : (
                                        '--'
                                    )}
                                </Descriptions.Item>

                                <Descriptions.Item label="Expired">
                                    {stats ? (
                                        stats.expired_status === 0 ? (
                                            <Tag color="green">
                                                <SafetyCertificateTwoTone twoToneColor="green" /> NO
                                            </Tag>
                                        ) : (
                                            <Tag color="red">
                                                <SafetyCertificateTwoTone twoToneColor="red" /> YES
                                            </Tag>
                                        )
                                    ) : (
                                        '--'
                                    )}
                                </Descriptions.Item>

                                <Descriptions.Item label="Main URL Length">
                                    <span style={{ color: 'purple' }}>
                                        <CrownTwoTone twoToneColor="purple" /> {stats && stats.main_url ? stats.main_url.length : '--'}
                                    </span>
                                </Descriptions.Item>
                            </Descriptions>
                        </Col>
                    </Row>
                </Card>
            </Col>
        </Row>
        </>
    );
}


export default PerLinkStat;