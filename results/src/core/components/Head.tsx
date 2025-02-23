import React from 'react'
import Helmet from 'react-helmet'
import { usePageContext } from 'core/helpers/pageContext'
import { getPageSocialMeta, getPageMeta } from 'core/helpers/pageHelpers'
import { useI18n } from 'core/i18n/i18nContext'
// import { useTools } from 'core/helpers/toolsContext'
import colors from 'core/theme/colors'
import classNames from 'classnames'
import Fonts from 'Fonts/Fonts'

const Head = () => {
    const pageContext = usePageContext()
    const { currentEdition, currentSurvey, isCapturing, isRawChartMode } = pageContext

    const { getString } = useI18n()
    // const { getToolName } = useTools()

    const overrides = {}
    // const toolName = getToolName(context)
    // if (toolName) {
    //     overrides.title = `${websiteTitle}: ${toolName}`
    // }

    const meta = getPageMeta({ pageContext, getString, overrides })
    const socialMeta = getPageSocialMeta({ pageContext, getString, overrides })
    const description = getString(`general.results.description`)?.t

    const mergedMeta = [
        { charset: 'utf-8' },
        // responsive
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        // google check
        {
            name: 'google-site-verification',
            content: 'hrTRsz9fkGmQlVbLBWA4wmhn0qsI6_M3NKemTGCkpps'
        },
        { name: 'custom-meta-start' },
        { name: 'description', content: description },
        // social
        ...socialMeta,
        { name: 'custom-meta-end' }
    ]

    const bodyClassNames = classNames(
        `Page--${pageContext.id}`,
        `edition-${currentEdition.id}`,
        `survey-${currentSurvey.id}`,
        {
            capture: isCapturing,
            rawchartmode: isRawChartMode,
            nocapture: !isCapturing
        }
    )
    const faviconUrl =
        pageContext?.currentEdition?.faviconUrl ??
        `${process.env.GATSBY_ASSETS_URL}/surveys/${currentEdition.id}-favicon.png`

    return (
        <>
            <Helmet
                defaultTitle={meta.fullTitle}
                bodyAttributes={{
                    class: bodyClassNames
                }}
            >
                <html lang="en" />
                <title>{meta.title}</title>
                <link rel="shortcut icon" href={faviconUrl} />
                <meta name="theme-color" content={colors.link} />
                <Fonts />
                {mergedMeta.map((meta, i) => (
                    <meta {...meta} key={i} />
                ))}
            </Helmet>
        </>
    )
}

export default Head
