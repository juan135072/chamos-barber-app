import React from 'react'
import Layout from '../components/Layout'

const TestDeployment: React.FC = () => {
  return (
    <Layout title="Test Deployment" description="Testing deployment">
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--accent-color)', fontSize: '3rem' }}>
          ✅ Deployment Test
        </h1>
        <p style={{ fontSize: '1.5rem', marginTop: '1rem' }}>
          Timestamp: {new Date().toISOString()}
        </p>
        <p style={{ fontSize: '1.2rem', marginTop: '1rem' }}>
          Commit: c715511
        </p>
        <p style={{ fontSize: '1rem', marginTop: '2rem', color: 'var(--accent-color)' }}>
          Si ves esto, el deployment está funcionando correctamente.
        </p>
      </div>
    </Layout>
  )
}

export default TestDeployment
