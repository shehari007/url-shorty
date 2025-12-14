import React from 'react';
import { Typography, Divider } from 'antd';
import { FileProtectOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function Terms() {
  const lastUpdated = 'December 14, 2025';

  return (
    <div className="terms-page">
      <div className="terms-page-header">
        <div className="terms-page-icon">
          <FileProtectOutlined />
        </div>
        <Title level={1} className="terms-page-title">Terms of Service</Title>
        <Text type="secondary" className="terms-page-date">
          Last updated: {lastUpdated}
        </Text>
      </div>

      <div className="terms-page-content">
        <Paragraph className="terms-intro-text">
          Welcome to <strong>Shorty URL</strong>, a free and open-source URL shortening service. 
          By accessing or using our service, you agree to be bound by these Terms of Service. 
          Please read them carefully before using the platform.
        </Paragraph>

        <Divider />

        <section className="terms-section">
          <Title level={3}>1. About Shorty URL</Title>
          <Paragraph>
            Shorty URL is a free, open-source URL shortening service developed and maintained by the 
            community for educational and practical purposes. We provide this service "as is" 
            without any warranties or guarantees. The platform allows users to create shortened 
            versions of long URLs, generate QR codes, and access basic analytics.
          </Paragraph>
        </section>

        <section className="terms-section">
          <Title level={3}>2. Acceptance of Terms</Title>
          <Paragraph>
            By accessing and using Shorty URL, you acknowledge that you have read, understood, and 
            agree to be bound by these Terms of Service. If you do not agree to these terms, 
            please do not use our service. We reserve the right to modify these terms at any time, 
            and your continued use of the service constitutes acceptance of any changes.
          </Paragraph>
        </section>

        <section className="terms-section">
          <Title level={3}>3. Service Description</Title>
          <Paragraph>
            Shorty URL provides the following services:
          </Paragraph>
          <ul className="terms-list">
            <li>URL shortening - Convert long URLs into short, shareable links</li>
            <li>QR code generation - Create QR codes for your shortened links</li>
            <li>Basic analytics - Track click counts and link performance</li>
            <li>Link management - View and manage your shortened URLs</li>
          </ul>
          <Paragraph>
            These features are provided free of charge and may be modified, suspended, or 
            discontinued at any time without prior notice.
          </Paragraph>
        </section>

        <section className="terms-section">
          <Title level={3}>4. Acceptable Use Policy</Title>
          <Paragraph>
            You agree NOT to use Shorty URL for any of the following purposes:
          </Paragraph>
          <ul className="terms-list">
            <li>Any unlawful purpose or to promote illegal activities</li>
            <li>Distributing malware, viruses, or any harmful software</li>
            <li>Phishing, scamming, or other fraudulent activities</li>
            <li>Sharing content that is illegal, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable</li>
            <li>Infringing on intellectual property rights of others</li>
            <li>Spamming or sending unsolicited communications</li>
            <li>Attempting to circumvent any security measures</li>
            <li>Any activity that could damage, disable, or impair the service</li>
            <li>Collecting or harvesting user data without consent</li>
          </ul>
          <Paragraph>
            Violation of these terms may result in immediate termination of your access to the 
            service and blacklisting of your URLs without prior notice.
          </Paragraph>
        </section>

        <section className="terms-section">
          <Title level={3}>5. Disclaimer of Warranties</Title>
          <Paragraph>
            <strong>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
            EITHER EXPRESS OR IMPLIED.</strong>
          </Paragraph>
          <Paragraph>
            We do not warrant that:
          </Paragraph>
          <ul className="terms-list">
            <li>The service will be uninterrupted, timely, secure, or error-free</li>
            <li>The results obtained from using the service will be accurate or reliable</li>
            <li>The quality of any products, services, information, or other material obtained through the service will meet your expectations</li>
            <li>Any errors in the service will be corrected</li>
          </ul>
          <Paragraph>
            Any material downloaded or otherwise obtained through the use of the service is done 
            at your own discretion and risk, and you will be solely responsible for any damage 
            to your computer system or loss of data that results from the download of any such material.
          </Paragraph>
        </section>

        <section className="terms-section">
          <Title level={3}>6. Limitation of Liability</Title>
          <Paragraph>
            <strong>TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, SHORTY URL AND ITS MAINTAINERS, 
            CONTRIBUTORS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:</strong>
          </Paragraph>
          <ul className="terms-list">
            <li>Loss of profits, revenue, or data</li>
            <li>Loss of goodwill or reputation</li>
            <li>Cost of substitute goods or services</li>
            <li>Any unauthorized access to or alteration of your data</li>
            <li>Any content or conduct of any third party on the service</li>
            <li>Any bugs, viruses, or similar harmful code transmitted through the service</li>
          </ul>
          <Paragraph>
            This limitation applies regardless of whether the damages arise from use or misuse of 
            the service, inability to use the service, or any other cause.
          </Paragraph>
        </section>

        <section className="terms-section">
          <Title level={3}>7. Content Responsibility</Title>
          <Paragraph>
            Users are solely responsible for the URLs they shorten and the content they link to. 
            Shorty URL does not monitor, endorse, or take responsibility for any content accessible 
            through shortened URLs created using our service.
          </Paragraph>
          <Paragraph>
            We reserve the right to:
          </Paragraph>
          <ul className="terms-list">
            <li>Remove or disable any shortened URL that violates these terms</li>
            <li>Blacklist URLs that are reported as malicious or inappropriate</li>
            <li>Cooperate with law enforcement when required by law</li>
            <li>Take any action we deem necessary to protect the integrity of our service</li>
          </ul>
        </section>

        <section className="terms-section">
          <Title level={3}>8. Privacy & Data Collection</Title>
          <Paragraph>
            We collect minimal data necessary for the operation of the service:
          </Paragraph>
          <ul className="terms-list">
            <li><strong>IP Addresses</strong> - For security, rate limiting, and basic analytics</li>
            <li><strong>User Agents</strong> - For analytics and service optimization</li>
            <li><strong>URLs</strong> - The original URLs you submit for shortening</li>
            <li><strong>Click Data</strong> - Anonymous click counts and timestamps</li>
          </ul>
          <Paragraph>
            We do not sell, trade, or share personal data with third parties. As an open-source 
            project, our code and data handling practices are transparent and publicly auditable 
            on GitHub.
          </Paragraph>
        </section>

        <section className="terms-section">
          <Title level={3}>9. Open Source License</Title>
          <Paragraph>
            Shorty URL is open-source software released under the MIT License. You are free to view, 
            fork, modify, and distribute the source code in accordance with the license terms. 
            The full source code is available on our GitHub repository.
          </Paragraph>
          <Paragraph>
            The MIT License means:
          </Paragraph>
          <ul className="terms-list">
            <li>The software is provided without warranty of any kind</li>
            <li>The authors are not liable for any claims, damages, or other liability</li>
            <li>You may use the software for any purpose, including commercial applications</li>
            <li>You must include the original copyright notice in any copy or substantial portion of the software</li>
          </ul>
        </section>

        <section className="terms-section">
          <Title level={3}>10. Service Modifications</Title>
          <Paragraph>
            We reserve the right to modify, suspend, or discontinue the service (or any part 
            thereof) at any time, with or without notice. We shall not be liable to you or any 
            third party for any modification, suspension, or discontinuation of the service.
          </Paragraph>
        </section>

        <section className="terms-section">
          <Title level={3}>11. Reporting Violations</Title>
          <Paragraph>
            If you encounter a shortened URL that violates these terms or links to harmful content, 
            please report it using our Report page. We will review all reports and take appropriate 
            action, which may include removing the offending URL and blacklisting the original domain.
          </Paragraph>
        </section>

        <section className="terms-section">
          <Title level={3}>12. Contact</Title>
          <Paragraph>
            For questions about these Terms of Service, please contact us through our Contact page 
            or open an issue on our GitHub repository. For urgent matters regarding malicious 
            content, please use our Report page.
          </Paragraph>
        </section>

        <Divider />

        <section className="terms-footer-section">
          <Paragraph type="secondary">
            By using Shorty URL, you acknowledge that you have read, understood, and agree to be bound 
            by these Terms of Service.
          </Paragraph>
          <Paragraph type="secondary" strong>
            This is a free, open-source project provided without any guarantees. Use at your own discretion.
          </Paragraph>
        </section>
      </div>
    </div>
  );
}
