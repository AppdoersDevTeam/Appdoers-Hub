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
    padding: 36,
    ...pdfFontStyles.regular,
    fontSize: 9,
    color: PDF_SLATE_900,
  },
  header: {
    backgroundColor: PDF_BRAND_DEEP,
    marginHorizontal: -36,
    marginTop: -36,
    marginBottom: 16,
    paddingHorizontal: 36,
    paddingVertical: 18,
  },
  headerTitle: {
    ...pdfFontStyles.bold,
    fontSize: 16,
    color: '#ffffff',
  },
  headerSub: {
    marginTop: 4,
    fontSize: 9,
    color: PDF_BRAND_LIGHT,
  },
  sectionTitle: {
    ...pdfFontStyles.bold,
    fontSize: 10,
    color: PDF_BRAND_SECONDARY,
    marginBottom: 6,
    marginTop: 4,
  },
  callout: {
    backgroundColor: PDF_BRAND_LIGHT,
    borderLeftWidth: 3,
    borderLeftColor: PDF_BRAND_SECONDARY,
    padding: 8,
    marginBottom: 12,
  },
  calloutText: {
    fontSize: 8.5,
    color: PDF_SLATE_600,
    lineHeight: 1.4,
  },
  step: {
    marginBottom: 8,
  },
  stepNum: {
    ...pdfFontStyles.bold,
    fontSize: 9,
    color: PDF_SLATE_900,
    marginBottom: 2,
  },
  stepBody: {
    fontSize: 8.5,
    lineHeight: 1.4,
    color: PDF_SLATE_600,
  },
  code: {
    fontFamily: 'Courier',
    fontSize: 7,
    backgroundColor: '#f1f5f9',
    padding: 6,
    marginTop: 3,
    lineHeight: 1.3,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
    fontSize: 7,
    color: PDF_SLATE_600,
  },
})

const HUB_URL = 'https://appdoers-hub-two.vercel.app'
const PROJECT_INSTALL = `powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/AppdoersDevTeam/Appdoers-Hub/master/hub-cursor-kit/install-project.ps1 -OutFile $env:TEMP\\hub-install.ps1; & $env:TEMP\\hub-install.ps1"`
const LAPTOP_SETUP = `powershell -ExecutionPolicy Bypass -File "Appdoers CRM\\hub-cursor-kit\\setup-my-cursor-token.ps1"`

export function CursorTeamSetupPDFDocument() {
  return (
    <Document title="Cursor + Hub — Team Setup">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cursor + Hub</Text>
          <Text style={styles.headerSub}>Laptop once · each new project one paste</Text>
        </View>

        <View style={styles.callout}>
          <Text style={styles.calloutText}>
            Same repo and shared Cursor Pro are fine. Token lives on your laptop only
            (%USERPROFILE%\.appdoers\hub.env). Never swap env files between laptops.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>A. New laptop (once per person)</Text>
        <View style={styles.step}>
          <Text style={styles.stepNum}>1. Hub → My Account → Cursor setup → Generate token</Text>
          <Text style={styles.stepBody}>2. Run once from Appdoers Work folder:</Text>
          <Text style={styles.code}>{LAPTOP_SETUP}</Text>
          <Text style={styles.stepBody}>Paste token when asked. Never edit again on this laptop.</Text>
        </View>

        <Text style={styles.sectionTitle}>B. Each new project (one paste, zero prompts)</Text>
        <View style={styles.step}>
          <Text style={styles.stepBody}>Open PowerShell in the project folder and run:</Text>
          <Text style={styles.code}>{PROJECT_INSTALL}</Text>
          <Text style={styles.stepBody}>
            Installs tools + Cursor rules. Uses your laptop token automatically.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>C. Use Cursor</Text>
        <View style={styles.step}>
          <Text style={styles.stepBody}>
            Open the project folder in Cursor → new Agent chat → pick client and project.
            Tickets and time logging are automatic.
          </Text>
        </View>

        <Text style={styles.footer}>
          Hub: {HUB_URL} · hub-cursor-kit/README.md in Appdoers-Hub repo
        </Text>
      </Page>
    </Document>
  )
}
