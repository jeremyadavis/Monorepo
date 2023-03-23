// note: not currently exposed

import { TemplateFunction } from '../../types/surveys'
import { graphqlize, getSectionItems } from '../helpers'
import { getFiltersTypeName, getFacetsTypeName } from '../helpers'
import { getToolsFeaturesResolverMap } from '../resolvers'

export const section_tools: TemplateFunction = ({ question, survey, edition, section }) => {
    const fieldTypeName = `${graphqlize(survey.id)}${graphqlize(edition.id)}${graphqlize(
        section.id
    )}AllFeatures`
    const items = getSectionItems({ survey, edition, section })

    return {
        ...question,
        id: `${section.id}_allFeatures`,
        fieldTypeName,
        typeDef: `type ${fieldTypeName} {
    ids: [String]
    years: [Int]
    items(filters: ${getFiltersTypeName(
        survey.id
    )},  parameters: Parameters, facet: ${getFacetsTypeName(survey.id)}): [${graphqlize(
            survey.id
        )}Feature]
}`,
        resolverMap: getToolsFeaturesResolverMap({ survey, items })
    }
}
