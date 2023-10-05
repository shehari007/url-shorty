import React, { useState } from 'react';
import { Card, Col, Row, Button, Form, Input, Alert } from 'antd';
import axios from 'axios';

const Contact = () => {

    const { TextArea } = Input;
    const [HTTPError, setHTTPError] = useState(100);
   // const [Loading, setLoading] = useState(false);
    const [formValues, setFormValues] = useState({
        fullname: '',
        email: '',
    });

    const handleFormSubmit = async (values) => {
       // setLoading(true);
        setHTTPError(100);
        var detail = document.getElementById('detail').value;
        const { email, fullname } = values;
        try {
            var api = await axios.post(process.env.REACT_APP_API_CONTACT_URL, {
                email: email,
                fullname: fullname,
                detail: !detail ? '' : detail
            })
            console.log(api)
            if (api.status === 200) {
              //  setLoading(false);
                setHTTPError(200);
            }
        } catch (error) {
            console.log(error)
            if (error.response.status === 500) {
                setHTTPError(500);
            }
        }
    };

    return (
        <Row gutter={8} style={{ justifyContent: 'center' }}>
            <Col span={24} style={{ minWidth: '100%' }}>
                <Card
                    style={{

                        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                    <h2>Contact Us</h2>
                    <Form
                        layout="vertical"
                        onFinish={handleFormSubmit}
                        initialValues={formValues} // Set initial form values
                    >
                        <Form.Item
                            label="Enter Full Name"
                            name="fullname"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please enter your full name',
                                },
                            ]}>
                            <Input placeholder="your full name here" onChange={(e) => setFormValues({ ...formValues, fullname: e.target.value })} />
                        </Form.Item>
                        <Form.Item
                            label="Enter Email"
                            name="email"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please enter your email address!',
                                },
                                {
                                    type: 'email',
                                    message: 'Please enter a valid email address!',
                                },
                            ]}>
                            <Input placeholder="yourEmail@email.com" onChange={(e) => setFormValues({ ...formValues, email: e.target.value })} />
                        </Form.Item>
                        <Form.Item label="Enter your message"
                        name="message"
                         rules={[
                            {
                                required: true,
                                message: 'Please enter your message',
                            },
                        ]}>
                            <TextArea name="detail" rows={4} defaultValue="" placeholder="Enter your message here" id="detail" />
                        </Form.Item>
                        <Form.Item >
                            <Button type="primary" htmlType="submit">Submit</Button>
                        </Form.Item>
                    </Form>
                    {HTTPError === 200 ?
                        <Alert
                            message={<><p>Your Query successfully submitted, We will Contact in 24h, Thanks for contacting!</p></>}
                            type="success"
                            style={{ textAlign: 'center', maxWidth: '95%', marginTop: '15px' }}
                            showIcon
                            closable
                        />
                        :
                        HTTPError === 500 ?
                            <Alert
                                message={<><p>Server Error, Please try again later</p></>}
                                type="error"
                                style={{ textAlign: 'center', maxWidth: '95%', marginTop: '15px' }}
                                showIcon
                                closable
                            />
                            :
                            null

                    }
                </Card>
            </Col>


        </Row>

    );
}


export default Contact;