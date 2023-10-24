import { NO_ANSWER } from '@devographics/constants'
import { ResponseEditionData, ResponsesTypes } from '@devographics/types'
import { GenericComputeOptions, genericComputeFunction } from '../generic'

/*

Take results from a question's predefined options and results from a question's
freeform field and combine them into a single results dataset

*/
export const combineEditionData = (
    responseEditionData: ResponseEditionData,
    freeformEditionData?: ResponseEditionData
) => {
    if (!freeformEditionData) {
        // if there is no freeform data just return regular response data
        return responseEditionData
    } else {
        let regularBuckets = responseEditionData.buckets
        const regularBucketsIds = regularBuckets.map(b => b.id)
        // get rid of freeform data's "no answer" bucket
        let freeformBuckets = freeformEditionData.buckets
            .filter(b => b.id !== NO_ANSWER)
            .map(b => ({ ...b, isFreeformData: true }))

        // in some cases, there can be buckets in common between regular and freeform data
        // if so add the freeform counts to the regular bucket
        regularBuckets = regularBuckets.map(bucket => {
            // look for a freeform bucket with the same id as the regular bucket
            const freeformBucket = freeformBuckets.find(b => b.id === bucket.id)!
            if (freeformBucket) {
                const combinedCount = bucket.count! + freeformBucket.count!
                return { ...bucket, count: combinedCount }
            } else {
                return bucket
            }
        })

        // remove any freeform bucket that is already included in regular buckets
        freeformBuckets = freeformBuckets.filter(b => !regularBucketsIds.includes(b.id))

        const combinedBuckets = [...regularBuckets, ...freeformBuckets]
        const combinedEditionData = { ...responseEditionData, buckets: combinedBuckets }
        return combinedEditionData
    }
}

export const combineResults = (
    responseResults: ResponseEditionData[],
    freeformResults: ResponseEditionData[]
) => {
    const combinedResults: ResponseEditionData[] = []
    for (let editionResponseData of responseResults) {
        const editionFreeformData = freeformResults.find(
            editionData => editionData.editionId === editionResponseData.editionId
        )
        const combinedEditionData = combineEditionData(editionResponseData, editionFreeformData)
        combinedResults.push(combinedEditionData)
    }
    return combinedResults
}

export const combineWithFreeform = async (
    responseResults: ResponseEditionData[],
    options: GenericComputeOptions
) => {
    const newOptions = {
        ...options,
        computeArguments: { ...options.computeArguments, responsesType: ResponsesTypes.FREEFORM }
    }
    const freeformResults = await genericComputeFunction(newOptions)
    if (freeformResults) {
        return combineResults(responseResults, freeformResults)
    } else {
        return responseResults
    }
}
