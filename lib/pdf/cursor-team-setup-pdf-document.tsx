import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import {
  PDF_BRAND_DEEP,
  PDF_BRAND_LIGHT,
  PDF_BRAND_SECONDARY,
  PDF_SLATE_600,
  PDF_SLATE_900,
} from '@/lib/pdf/brand'
import { pdfFontStyles } from '@/lib/pdf/fonts'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    ...pdfFontStyles.regular,
    fontSize: 10,
    color: PDF_SLATE_900,
  },
  header: {
    backgroundColor: PDF_BRAND_DEEP,
    marginHorizontal: -40,
    marginTop: -40,
    marginBottom: 24,
    paddingHorizontal: 40,
    paddingVertical: 22,
  },
  headerTitle: {
    ...pdfFontStyles.bold,
    fontSize: 18,
    color: '#ffffff',
  },
  headerSub: {
    marginTop: 4,
    fontSize: 10,
    color: PDF_BRAND_LIGHT,
  },
  callout: {
    backgroundColor: PDF_BRAND_LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: PDF_BRAND_SECONDARY,
    padding: 10,
    marginBottom: 18,
  },
  calloutText: {
    fontSize: 9,
    color: PDF_SLATE_600,
    lineHeight: 1.45,
  },
  step: {
    marginBottom: 12,
  },
  stepNum: {
    ...pdfFontStyles.bold,
    fontSize: 11,
    color: PDF_BRAND_SECONDARY,
    marginBottom: 3,
  },
  stepBody: {
    fontSize: 10,
    lineHeight: 1.45,
    color: PDF_SLATE_900,
  },
  code: {
    fontFamily: 'Courier',
    fontSize: 8.5,
    backgroundColor: '#f1f5f9',
    padding: 8,
    marginTop: 4,
    lineHeight: 1.35,
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    fontSize: 8,
    color: PDF_SLATE_600,
  },
})

const HUB_URL = 'https://appdoers-hub-two.vercel.app'

export function CursorTeamSetupPDFDocument() {
  return (
    <Document title="Cursor + Hub — Team Setup">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cursor + Hub</Text>
          <Text style={styles.headerSub}>One-time setup on your laptop (5 minutes)</Text>
        </View>

        <View style={styles.callout}>
          <Text style={styles.calloutText}>
            Everyone uses the same repo and can share one Cursor Pro login. Each person runs this
            once on their own laptop. Your token saves to your computer only — never edit it again.
          </Text>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepNum}>1. Get your token in Hub</Text>
          <Text style={styles.stepBody}>
            Sign in to Appdoers Hub → My Account (sidebar) → Cursor setup → enter a name → Generate
            Cursor token → Copy token or .env block.
          </Text>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepNum}>2. Run the setup script once</Text>
          <Text style={styles.stepBody}>
            Open PowerShell in your Appdoers Work folder and run:
          </Text>
          <Text style={styles.code}>
            {`powershell -ExecutionPolicy Bypass -File "Appdoers CRM\\hub-cursor-kit\\setup-my-cursor-token.ps1"`}
          </Text>
          <Text style={styles.stepBody}>
            Paste your token when asked. It saves to %USERPROFILE%\.appdoers\hub.env on your laptop.
          </Text>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepNum}>3. Test</Text>
          <Text style={styles.code}>
            {`cd "Appdoers CRM"\nnode tools/hub-workflow-cli.mjs whoami`}
          </Text>
          <Text style={styles.stepBody}>You should see your name.</Text>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepNum}>4. Use Cursor</Text>
          <Text style={styles.stepBody}>
            Open the project folder you are working on (e.g. AppdoersWebsite) in Cursor. Start a
            new Agent chat — it will ask for client, project, and confirm your name. Tickets and
            time logging happen automatically.
          </Text>
        </View>

        <Text style={styles.footer}>
          Hub: {HUB_URL} · Questions: ask in team chat or see hub-cursor-kit/README.md in the repo
        </Text>
      </Page>
    </Document>
  )
}
