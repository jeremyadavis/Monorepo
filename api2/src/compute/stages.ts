import { ResultsByYear, FacetItem } from '../types/compute'
import { ratioToPercentage } from './common'
import { getEntity } from '../load/entities'
import sortBy from 'lodash/sortBy.js'
import { CompletionResult } from './completion'
import sum from 'lodash/sum.js'
import sumBy from 'lodash/sumBy.js'
import take from 'lodash/take.js'
import round from 'lodash/round.js'
import difference from 'lodash/difference.js'
import isEmpty from 'lodash/isEmpty.js'

/*

Discard any result where id is {}, "", [], etc. 

*/
export async function discardEmptyIds(resultsByYears: ResultsByYear[]) {
    for (let year of resultsByYears) {
        year.facets = year.facets.filter(b => typeof b.id === 'number' || !isEmpty(b.id))
        for (let facet of year.facets) {
            facet.buckets = facet.buckets.filter(b => typeof b.id === 'number' || !isEmpty(b.id))
        }
    }
}

// add facet limits
/* 

For example, when faceting salary by countries we might want to only
keep the top 10 countries; or discard any countries with less than X
respondents or representing less than Y% of respondents

*/
export async function limitFacets(
    resultsByYears: ResultsByYear[],
    {
        facetLimit,
        facetMinPercent,
        facetMinCount
    }: { facetLimit?: number; facetMinPercent?: number; facetMinCount?: number }
) {
    for (let year of resultsByYears) {
        // if a minimum question percentage/count is specified, filter out
        // any facets that represent less than that
        if (facetMinPercent || facetMinCount) {
            year.facets = year.facets.filter(f => {
                const abovePercent = facetMinPercent
                    ? f.completion.percentage_question > facetMinPercent
                    : true
                const aboveCount = facetMinCount ? f.completion.count > facetMinCount : true
                return abovePercent && aboveCount
            })
        }
        // if a max number of facets is specified, limit list to that
        if (facetLimit) {
            year.facets = take(year.facets, facetLimit)
        }
    }
}

// add means
export async function addMeans(resultsByYears: ResultsByYear[], values: string[] | number[]) {
    for (let year of resultsByYears) {
        for (let facet of year.facets) {
            let totalValue = 0
            let totalCount = 0
            const coeffs = values.map((id, index) => ({ id, coeff: index + 1 }))
            facet.buckets.forEach((bucket, index) => {
                const { count, id } = bucket
                const coeff = coeffs.find(c => c.id === id)?.coeff ?? 1
                totalValue += count * coeff
                totalCount += count
            })
            facet.mean = round(totalValue / totalCount, 2)
        }
    }
}

// if aggregation has values defined, set any missing value to 0
// so that all buckets have the same shape
export async function addMissingBucketValues(resultsByYears: ResultsByYear[], values: string[]) {
    for (let year of resultsByYears) {
        for (let facet of year.facets) {
            const existingValues = facet.buckets.map(b => b.id)
            const missingValues = difference(
                values.map(i => i.toString()),
                existingValues.map(i => i.toString())
            )
            missingValues.forEach(id => {
                const zeroBucketItem = {
                    id,
                    count: 0,
                    percentage_question: 0,
                    percentage_facet: 0,
                    percentage_survey: 0,
                    count_all_facets: 0,
                    percentage_all_facets: 0
                }
                facet.buckets.push(zeroBucketItem)
            })
        }
    }
}

// add entities to facet and bucket items if applicable
export async function addEntities(resultsByYears: ResultsByYear[]) {
    for (let year of resultsByYears) {
        for (let facet of year.facets) {
            const facetEntity = await getEntity(facet)
            if (facetEntity) {
                facet.entity = facetEntity
            }
            for (let bucket of facet.buckets) {
                const bucketEntity = await getEntity(bucket)
                if (bucketEntity) {
                    bucket.entity = bucketEntity
                }
            }
        }
    }
}

// add completion counts for each year and facet
export async function addCompletionCounts(
    resultsByYears: ResultsByYear[],
    totalRespondentsByYear: {
        [key: number]: number
    },
    completionByYear: Record<number, CompletionResult>
) {
    for (let yearObject of resultsByYears) {
        const totalRespondents = totalRespondentsByYear[yearObject.year] ?? 0
        const questionRespondents = completionByYear[yearObject.year]?.total ?? 0
        yearObject.completion = {
            total: totalRespondents,
            count: questionRespondents,
            percentage_survey: ratioToPercentage(questionRespondents / totalRespondents)
        }
        for (let facet of yearObject.facets) {
            // TODO: not accurate because it doesn't account for
            // respondents who didn't answer the question
            const facetTotal = sumBy(facet.buckets, 'count')
            facet.completion = {
                total: totalRespondents,
                count: facetTotal,
                percentage_question: ratioToPercentage(facetTotal / questionRespondents),
                percentage_survey: ratioToPercentage(facetTotal / totalRespondents)
            }
        }
    }
}

// apply bucket cutoff
export async function applyCutoff(resultsByYears: ResultsByYear[], cutoff: number = 1) {
    for (let year of resultsByYears) {
        for (let facet of year.facets) {
            facet.buckets = facet.buckets.filter(bucket => bucket.count >= cutoff)
        }
    }
}

// apply bucket limit
export async function limitBuckets(resultsByYears: ResultsByYear[], limit: number = 1000) {
    for (let year of resultsByYears) {
        for (let facet of year.facets) {
            facet.buckets = take(facet.buckets, limit)
        }
    }
}

// add percentages relative to question respondents and survey respondents
export async function addPercentages(resultsByYears: ResultsByYear[]) {
    for (let year of resultsByYears) {
        for (let facet of year.facets) {
            for (let bucket of facet.buckets) {
                bucket.percentage_survey = ratioToPercentage(bucket.count / year.completion.total)
                bucket.percentage_question = ratioToPercentage(bucket.count / year.completion.count)
                bucket.percentage_facet = ratioToPercentage(bucket.count / facet.completion.count)

                // const defaultFacetCount
                // const all
                const allCounts = year.facets.map(
                    (f: FacetItem) => f.buckets.find(b => b.id === bucket.id)?.count || 0
                )
                bucket.count_all_facets = sum(allCounts)
                bucket.percentage_all_facets = ratioToPercentage(
                    bucket.count_all_facets / year.completion.count
                )
            }
        }
    }
}

// TODO ? or else remove this
export async function addDeltas(resultsByYears: ResultsByYear[]) {
    // // compute deltas
    // resultsWithPercentages.forEach((year, i) => {
    //     const previousYear = resultsByYear[i - 1]
    //     if (previousYear) {
    //         year.buckets.forEach(bucket => {
    //             const previousYearBucket = previousYear.buckets.find(b => b.id === bucket.id)
    //             if (previousYearBucket) {
    //                 bucket.countDelta = bucket.count - previousYearBucket.count
    //                 bucket.percentageDelta =
    //                     Math.round(100 * (bucket.percentage - previousYearBucket.percentage)) / 100
    //             }
    //         })
    //     }
    // })
}

interface SortParameters {
    sort: string
    order: 1 | -1
    options?: string[] | number[]
}
export async function sortBuckets(resultsByYears: ResultsByYear[], parameters: SortParameters) {
    console.log('// sortBuckets')
    console.log(parameters)
    const { sort, order, options } = parameters
    for (let year of resultsByYears) {
        for (let facet of year.facets) {
            if (sort === 'options') {
                if (options && !isEmpty(options)) {
                    // if values are specified, sort by values
                    facet.buckets = [...facet.buckets].sort((a, b) => {
                        // make sure everything is a string to avoid type mismatches
                        const stringValues = options.map(v => v.toString())
                        return (
                            stringValues.indexOf(a.id.toString()) -
                            stringValues.indexOf(b.id.toString())
                        )
                    })
                }
            } else {
                // start with an alphabetical sort to ensure a stable
                // sort even when multiple items have same count
                facet.buckets = sortBy(facet.buckets, 'id')
                // sort by sort/order
                if (order === -1) {
                    // reverse first so that ids end up in right order when we reverse again
                    facet.buckets.reverse()
                    facet.buckets = sortBy(facet.buckets, sort)
                    facet.buckets.reverse()
                } else {
                    facet.buckets = sortBy(facet.buckets, sort)
                }
            }
        }
    }
}

export async function sortFacets(resultsByYears: ResultsByYear[], parameters: SortParameters) {
    const { sort, order, options } = parameters
    for (let year of resultsByYears) {
        if (options && !isEmpty(options)) {
            // if values are specified, sort by values
            year.facets = [...year.facets].sort((a, b) => {
                // make sure everything is a string to avoid type mismatches
                const stringValues = options.map(v => v.toString())
                return stringValues.indexOf(a.id.toString()) - stringValues.indexOf(b.id.toString())
            })
        } else {
            // start with an alphabetical sort to ensure a stable
            // sort even when multiple items have same count
            year.facets = sortBy(year.facets, 'id')
            // sort by sort/order
            if (order === -1) {
                // reverse first so that ids end up in right order when we reverse again
                year.facets.reverse()
                year.facets = sortBy(year.facets, sort)
                year.facets.reverse()
            } else {
                year.facets = sortBy(year.facets, sort)
            }
        }
    }
}
