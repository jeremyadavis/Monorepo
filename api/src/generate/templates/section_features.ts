import { ApiTemplateFunction } from '../../types/surveys'
import { graphqlize } from '../helpers'
import { getSectionToolsFeaturesResolverMap } from '../resolvers'
import { getFeatureFieldTypeName } from './feature'

export const section_features: ApiTemplateFunction = ({ question, survey, edition, section }) => {
    const fieldTypeName = `${graphqlize(survey.id)}${graphqlize(section.id)}SectionFeatures`
    return {
        ...question,
        id: `${section.id}_features`,
        fieldTypeName,
        typeDef: `type ${fieldTypeName} {
    ids: [String]
    years: [Int]
    items: [${getFeatureFieldTypeName({ survey })}]
}`,
        resolverMap: getSectionToolsFeaturesResolverMap('features')
    }
}
