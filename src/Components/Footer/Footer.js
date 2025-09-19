import React from 'react'
import { Row, Col, Layout, Typography, Divider } from 'antd';

const Footer = () => {
    const { Footer: AntFooter } = Layout;
    const { Title, Text } = Typography;

    return (
        <AntFooter
            style={{
                marginTop: 24,
                padding: '48px 24px 24px',
                background: 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)',
                color: 'rgba(17,24,39,0.85)',
                borderTop: '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0px -2px 8px rgba(0,0,0,0.04)'
            }}
        >
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <Row gutter={[32, 24]} justify="space-between">
                    <Col xs={24} sm={12} md={8}>
                        <Title level={5} style={{ color: '#111827', marginBottom: 16 }}>Quick Links</Title>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: '28px' }}>
                            <li><a href='?menu=home' style={{ color: '#1677ff' }}>Home</a></li>
                            <li><a href='?menu=report' style={{ color: '#1677ff' }}>Report Shorty Link</a></li>
                            <li><a href='?menu=per_link_stats' style={{ color: '#1677ff' }}>Per Link Stats</a></li>
                            <li><a href='?menu=contact' style={{ color: '#1677ff' }}>Contact Us</a></li>
                            <li><a href={process.env.REACT_APP_GITHUB_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#1677ff' }}>View GitHub</a></li>
                        </ul>
                    </Col>

                    <Col xs={24} sm={12} md={8}>
                        <Title level={5} style={{ color: '#111827', marginBottom: 16 }}>Our Vision</Title>
                        <Text style={{ color: 'rgba(17,24,39,0.75)' }}>
                            At Shorty URL, we simplify and secure the web with a fast, ad-free, SSL-protected, open-source URL shortener backed by a secure cloud database.
                            Our mission is to help users confidently shorten and share links while ensuring safety and satisfaction.
                        </Text>
                    </Col>

                    <Col xs={24} sm={12} md={8}>
                        <Title level={5} style={{ color: '#111827', marginBottom: 16 }}>About Us</Title>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', maxWidth: 360 }}>
                            <img
                                src='logo.png'
                                alt='Shorty URL logo'
                                width="56"
                                height="56"
                                style={{ borderRadius: 8, background: '#f3f4f6', padding: 6 }}
                            />
                            <Text style={{ color: 'rgba(17,24,39,0.75)' }}>
                                Free open-source URL shortening service with cutting‑edge features and SSL‑secured protection.
                            </Text>
                        </div>
                    </Col>
                </Row>

                <Divider style={{ borderColor: 'rgba(0,0,0,0.06)', margin: '24px 0' }} />

                <div style={{ textAlign: 'center', color: 'rgba(17,24,39,0.65)' }}>
                    <small>
                        &copy; {new Date().getFullYear()} All rights reserved to{' '}
                        <a href={process.env.REACT_APP_GITHUB_URL} target='_blank' rel='noopener noreferrer' style={{ color: '#1677ff' }}>
                            Muhammad Sheharyar Butt
                        </a>
                    </small>
                </div>
            </div>
        </AntFooter>
    )
}

export default Footer
