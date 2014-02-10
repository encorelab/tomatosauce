if typeof exports isnt "undefined" and exports isnt null
    # we're in node
    # jQuery = require("jquery")(window)
    jQuery = require('underscore.deferred')
    _ = require("underscore")
    Backbone = require("backbone")
    Backbone.$ = jQuery
    Drowsy = require("backbone.drowsy").Drowsy

    #var Wakeful = require('Backbone.Drowsy/wakeful').Wakeful;
    PP = {}
    exports.PP = PP
else
    window.PP = window.PP or {}
    PP = window.PP
    jQuery = window.$
    _ = window._
    Drowsy = window.Drowsy

class PP.Model
    @requiredCollections = [
        'scores',
        'states'
    ]

    @init: (url, db) ->
        deferredConfigure = jQuery.Deferred()

        unless url?
            throw new Error "Cannot configure model because no DrowsyDromedary URL was given!"
        unless db?
            throw new Error "Cannot configure model because no database name was given!"

        @baseURL = url
        @dbURL= "#{url}/#{db}"

        @server = new Drowsy.Server(url)
        @db = @server.database(db)

        @createNecessaryCollections(@requiredCollections).then =>
            @defineModelClasses()
            deferredConfigure.resolve()

        return deferredConfigure
                    

    @createNecessaryCollections: (requiredCollections) ->
        dfs = []
        df = jQuery.Deferred()

        @db.collections (colls) =>
            existingCollections = _.pluck(colls, 'name')
        
            for col in requiredCollections
                unless col in existingCollections
                    console.log "Creating collection '#{col}' under #{PP.Model.dbURL}"
                    dfs.push(@db.createCollection col)

        jQuery.when.apply(jQuery, dfs).done -> df.resolve()
        return df


    @defineModelClasses: ->

        class VotableMixin
            addVote: (username) ->
                votes = _.clone @get('votes')
                votes ?= []
                votes.push(username)
                @set 'votes', votes

            removeVote: (username) ->
                votes = _.without @get('votes'), username
                @set 'votes', votes

        class BuildOnableMixin
            addBuildOn: (author, content) ->
                build_ons = _.clone @get('build_ons')
                build_ons ?= []
                bo =
                    content: content
                    author: author
                    created_at: new Date()

                build_ons.push(bo)
                @set 'build_ons', build_ons

        class TaggableMixin
            addTag: (tag, tagger) =>
                unless tag instanceof PP.Model.Tag
                    console.error("Cannot addTag ", tag ," because it is not a PP.Model.Tag instance!")
                    throw "Invalid tag (doesn't exist)"

                unless tag.id
                    console.error("Cannot addTag ", tag ," to contribution ", @ ," because it doesn't have an id!")
                    throw "Invalid tag (no id)"

                existingTagRelationships = @get('tags') || []

                if _.any(existingTagRelationships, (tr) => tr.id is tag.id)
                    console.warn("Cannot addTag ", tag ," to contribution ", @ , " because it already has this tag.")
                    return this

                tagRel = @tagRel tag, tagger


                existingTagRelationships.push(tagRel)

                @set 'tags', existingTagRelationships

                return this

            removeTag: (tag, tagger) =>
                reducedTags = _.reject @get('tags'), (t) =>
                    (t.id is tag.id || t.name is tag.get('name')) and
                        (not tagger? || t.tagger is tagger)

                @set('tags', reducedTags)

                return this

            hasTag: (tag, tagger) =>
                _.any @get('tags'), (t) =>
                    t.id.toLowerCase() is tag.id and
                        (not tagger? || t.tagger is tagger)


        class @Score extends @db.Document('scores')

        class @Scores extends @db.Collection('scores')
            model: PP.Model.Contribution

        class @State extends @db.Document('states')

        class @States extends @db.Collection('states')
            model: PP.Model.State

    @initWakefulCollections = (wakefulUrl) ->
        deferreds = []

        camelCase = (str) ->
            str.replace(/([\-_][a-z]|^[a-z])/g, ($1) -> $1.toUpperCase().replace(/[\-_]/,''))

        @awake = {}

        for collName in @requiredCollections
            coll = new @[camelCase(collName)]()
            coll.wake wakefulUrl
            @awake[collName] = coll
            deferreds.push coll.fetch()

        jQuery.when.apply jQuery, deferreds
            
