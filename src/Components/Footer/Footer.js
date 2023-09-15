import React from 'react'
import { Row, Col, Layout } from 'antd';
const Footer = () => {
    const { Footer } = Layout;
    return (
        <Footer style={{ marginTop: '15px', minHeight: '220px', backgroundColor: 'white', boxShadow: '0px -5px 5px rgba(0, 0, 0, 0.1)' }} >
            <Row style={{ justifyContent: 'space-evenly', margin: '15px', alignContent: 'left', marginLeft: '15%', marginRight: '15%' }}>
                <Col>
                    <p><b>Menu</b></p>
                    <ul style={{ listStyle: 'none', padding: '0' }}>
                        <li><a href='?menu=home'>Home Page</a></li>
                        <li><a href='?menu=report'>Report Shorty Link</a></li>
                        <li><a href={process.env.REACT_APP_GITHUB_URL} target="_blank" rel="noreferrer">View Github</a></li>
                        <li><a href='?menu=contact'>Contact Us</a></li>
                    </ul>
                </Col>
                <Col>
                    <p><b>Our Vision</b></p>
                    <div style={{ maxWidth: '300px' }}>
                        <p>At Shorty URL, our vision is to lead the way in simplifying and securing web experiences. We're committed to providing a lightning-fast, ad-free, and SSL-secured URL shortening service fully Open-source and a secure cloud database. Our mission is to empower users to confidently shorten and share links, all while prioritizing their satisfaction and online safety.</p></div>
                </Col>
                <Col>
                    <p><b>About us</b></p>
                    <div  style={{ maxWidth: '250px' }}>
                    <img src='logo.png' height="80px" width="80px" alt="logo" style={{marginTop: '-15px', marginLeft: '-15px'}}></img><br/>
                    Free Open-Source URL shortening service, with cutting edge features and SSL-secured protection
                    </div>
                </Col>
             
            </Row>
            <hr />
            <div align="center">
                <p>&copy; Copyright {new Date().getFullYear()} All rights reserved to <a href={process.env.REACT_APP_GITHUB_URL} target='_blank' rel='noreferre'>Muhammad Sheharyar Butt</a></p>
            </div>
        </Footer>
    )
}

export default Footer
