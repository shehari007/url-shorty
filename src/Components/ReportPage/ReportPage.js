import React, {  useState } from 'react';
import { BugTwoTone } from '@ant-design/icons';
import { Card, Col, Row,  Button, Form, Input, Alert } from 'antd';
import axios from 'axios';

const ReportPage = () => {

    const { TextArea } = Input;
    const [HTTPError, setHTTPError] = useState(100);
    //const [Loading, setLoading] = useState(false);
    const [formValues, setFormValues] = useState({
        email: '',
        shorty_url: '',
    });

    const handleFormSubmit = async (values) => {
      //  setLoading(true);
        setHTTPError(100);
        var detail = document.getElementById('detail').value;
        const { email, shorty_url } = values;
        try {
            var api = await axios.post(process.env.REACT_APP_API_REPORT_URL, {
                email: email,
                shorty: shorty_url,
                detail: !detail ? '' : detail
            })
            console.log(api)
            if (api.status === 200) {
               // setLoading(false);
                setHTTPError(200);
            }
        } catch (error) {
            console.log(error)
            if (error.response.status === 404) {
                setHTTPError(404);
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
                        <h2>Report Shorty Link</h2>
                         <Alert
                      message={<><p><BugTwoTone twoToneColor="red" /> If you come across a Shorty Link that appears to be redirecting to a spam URL or being exploited for fraudulent purposes, please utilize this platform for reporting such instances.</p></>}
                      type="info"
                      style={{ textAlign: 'center', maxWidth: '95%', marginTop: '15px', marginBottom: '15px' }}
                    />
                    {/* <h2><BugTwoTone twoToneColor="red" /> If you come across a Shorty Link that appears to be redirecting to a spam URL or being exploited for fraudulent purposes<br/> please utilize this platform for reporting such instances.</h2> */}
                    <Form
                        layout="vertical"
                        onFinish={handleFormSubmit}
                        initialValues={formValues} // Set initial form values
                    >
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
                        <Form.Item
                            label="Enter Shorty URL"
                            name="shorty_url"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please enter Shorty URL',
                                },
                            ]}
                        >
                            <Input placeholder="Enter Shorty URL here" onChange={(e) => setFormValues({ ...formValues, shorty_url: e.target.value })} />
                        </Form.Item>
                        <Form.Item 
                        label="Detail about Link Report"
                        name="report_detail"
                        rules={[
                            {
                                required: true,
                                message: 'Please enter report detail',
                            },
                        ]}>
                            <TextArea name="detail" rows={4} placeholder="Enter any details about the url" id="detail" />
                        </Form.Item>
                        <Form.Item >
                            <Button type="primary" htmlType="submit">Submit</Button>
                        </Form.Item>
                    </Form>
                    {HTTPError === 200 ?
                        <Alert
                        message={<><p>Report successfully submitted, We will notify in 24H, Thanks for reporting!</p></>}
                        type="success"
                        style={{ textAlign: 'center', maxWidth: '95%', marginTop: '15px' }}
                        showIcon
                        closable
                      />
                      :
                      HTTPError === 404 ?
                      <Alert
                      message={<><p>Shorty Link Not Found in Our Database, Please Check and try again Later</p></>}
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


export default ReportPage;