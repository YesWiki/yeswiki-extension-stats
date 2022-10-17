/*
 * This file is part of the YesWiki Extension stats.
 *
 * Authors : see README.md file that was distributed with this source code.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import SpinnerLoader from '../../bazar/presentation/javascripts/components/SpinnerLoader.js'

let rootsElements = ['.stats-container'];
let isVueJS3 = (typeof Vue.createApp == "function");

let appParams = {
    components: { SpinnerLoader},
    data: function() {
        return {
            currentType :"",
            dataTable: null,
            dOMContentLoaded: false,
            entries: {},
            entriesUpdated: false,
            loading: false,
            message: "",
            messageClass: {alert:true,'alert-info':true},
            pages: [],
            pagesUpdated: false,
            statsToDelete: [],
            ready: false,
            stats:{}, 
            formTypes: {},
            types: {},
            typesEmpty: true,
        };
    },
    methods: {
        loadEntries: function (){
            let app = this;
            if (app.loading){
                return ;
            }
            $.ajax({
                method: "GET",
                url: wiki.url(`api/entries`),
                data: {
                    fields: 'id_fiche,id_typeannonce',
                },
                success: function(data){
                    app.entries = {};
                    app.dataToArray(data).forEach((entry)=>{
                        app.entries[entry.id_fiche] = {
                            formId:entry.id_typeannonce
                        };
                    });
                    app.entriesUpdated = true;
                    app.updateTypes();
                },
                error: function(xhr,status,error){
                    app.message = _t('STATS_LOADING_ERROR');
                    app.messageClass = {alert:true,['alert-danger']:true};
                },
            });
        },
        loadPages: function (){
            let app = this;
            if (app.loading){
                return ;
            }
            $.ajax({
                method: "GET",
                url: wiki.url(`api/pages`),
                success: function(data){
                    app.pages = [];
                    app.dataToArray(data).forEach((page)=>{
                        app.pages.push(page.tag);
                    });
                    app.pagesUpdated = true;
                    app.updateTypes();
                },
                error: function(xhr,status,error){
                    app.message = _t('STATS_LOADING_ERROR');
                    app.messageClass = {alert:true,['alert-danger']:true};
                },
            });
        },
        loadStats: function(){
            let app = this;
            if (app.loading){
                return ;
            }
            app.message = _t('STATS_LOADING');
            app.messageClass = {alert:true,'alert-info':true};
            app.loading = true;
            $.ajax({
                method: "GET",
                url: wiki.url(`api/triples`),
                data: {
                    property: 'https://yeswiki.net/vocabulary/stats',
                },
                success: function(data){
                    app.stats = app.dataToArray(data);
                    app.message = _t('STATS_LOADED');
                    app.messageClass = {alert:true,['alert-success']:true};
                    app.loading = false;
                    if (app.dOMContentLoaded){
                        app.pushDataToTable();
                    } else {
                        document.addEventListener('DOMContentLoaded', () => {
                            app.pushDataToTable();
                        });
                    }
                },
                error: function(xhr,status,error){
                    app.message = _t('STATS_LOADING_ERROR');
                    app.messageClass = {alert:true,['alert-danger']:true};
                    app.loading = false;
                },
                complete: function(){
                    app.ready = true;
                }
            });
        },
        dataToArray: function (data){
            let dataAsArray = [];
            if (Array.isArray(data)){
                dataAsArray = data;
            } else if (typeof data == "object"){
                Object.keys(data).forEach((key) => {
                    if (key != 'rawOutput'){
                        dataAsArray.push(data[key]);
                    }
                });
            }
            return dataAsArray;
        },
        pushDataToTable: function(){
            let app = this;
            if (app.loading){
                return ;
            }
            let d = new Date();
            let currentYear = d.getFullYear();
            let currentMonth = d.getMonth()+1;
            this.dataTable = $(this.$refs.dataTable).DataTable({
                ...DATATABLE_OPTIONS,
                ...{
                    data: app.convertForTable(app.getFormattedData()),
                    columns: [
                        {
                            data:"name",
                            title:_t('STATS_TAG'),
                            render: function ( data, type, row, meta ) {
                                return `<a class="modalbox" data-iframe="1" data-size="modal-lg" href="${wiki.url(data+'/iframe')}" title="${data}">${data}</a>`;
                            },
                            className: "data-table-word-break"
                        },
                        {data:"visits",title:_t('STATS_VISITS')},
                        {data:"visitors",title:_t('STATS_VISITORS')},
                        {data:"currentYearVisits",title:_t('STATS_YEAR_VISITS',{year:currentYear})},
                        {data:"currentYearVisitors",title:_t('STATS_YEAR_VISITORS',{year:currentYear})},
                        {data:"currentMonthVisits",title:_t('STATS_MONTH_VISITS',{year:currentYear%100,month:((currentMonth<10)?"0":"")+currentMonth})},
                        {data:"currentMonthVisitors",title:_t('STATS_MONTH_VISITORS',{year:currentYear%100,month:((currentMonth<10)?"0":"")+currentMonth})},
                        {data:"previousMonthVisits",title:_t('STATS_MONTH_VISITS',{year:(((currentMonth==1)?-1:0)+currentYear)%100,month:(currentMonth==1)?12:(((currentMonth<11)?"0":"")+(currentMonth-1))})},
                        {data:"previousMonthVisitors",title:_t('STATS_MONTH_VISITORS',{year:(((currentMonth==1)?-1:0)+currentYear)%100,month:(currentMonth==1)?12:(((currentMonth<11)?"0":"")+(currentMonth-1))})},
                        {
                            data:"type",
                            title:_t('STATS_TYPE'),
                            render: function ( data, type, row, meta ) {
                                if (data.match(/^entry .*/)){
                                    return _t('STATS_ENTRY',{formId:data.slice("entry ".length)})
                                } else if (data=="page"){
                                    return _t('STATS_PAGE');
                                }
                                return "";
                            }
                        },
                    ]
                },
                order:[
                    [1,'desc'],
                    [2,'desc'],
                    [0,'desc'],
                ],
                "scrollX": true
            });
            this.loadEntries();
            this.loadPages();
        },
        getFormattedData: function(){
            let app = this;
            let data = {};
            if (app.loading){
                return data;
            }
            app.stats.forEach((stat)=>{
                let values;
                try {
                    values = JSON.parse(stat.value);
                } catch (error) {
                    console.log({errorWhenParsingStat:stat,error});
                    values = {};
                }
                data[stat.resource] = {
                    values:values
                };
                data[stat.resource] = app.appendTotalVisits(data[stat.resource]);
            });
            return data;
        },
        convertForTable: function(formattedData){
            let app = this;
            let data = [];
            if (app.loading){
                return data;
            }
            Object.keys(formattedData).forEach((tag)=>{
                let stat = formattedData[tag];
                data.push({
                    name:tag,
                    visits:stat.visits,
                    visitors:stat.visitors,
                    currentYearVisits:stat.currentYear.visits,
                    currentYearVisitors:stat.currentYear.visitors,
                    currentMonthVisits:stat.currentMonth.visits,
                    currentMonthVisitors:stat.currentMonth.visitors,
                    previousMonthVisits:stat.previousMonth.visits,
                    previousMonthVisitors:stat.previousMonth.visitors,
                    type:""
                });
            });

            return data;
        },
        appendTotalVisits: function(stat){
            if (typeof stat != "object"){
                return {};
            }
            let keys = {
                v:'visits',
                s:'visitors'
            };
            let totalVisits = {s:0,v:0};
            let d = new Date();
            let currentYear = parseInt(d.getFullYear());
            let currentMonth = parseInt(d.getMonth())+1;
            let thisYearVisits = {s:0,v:0};
            let thisMonthVisits = {s:0,v:0};
            let previousMonthVisits = {s:0,v:0};
            for (const year in stat.values) {
                let intYear = parseInt(year);
                if (intYear > 2000 && intYear < 3000 && typeof stat.values[year] == "object") {
                    for (const month in stat.values[year]) {
                        let intMonth = parseInt(month);
                        if (intMonth > 0 && intMonth < 13 && typeof stat.values[year][month] == "object") {
                            Object.keys(keys).forEach((key)=>{
                                if (stat.values[year][month][key] != undefined){
                                    totalVisits[key] = totalVisits[key] + stat.values[year][month][key];
                                    if (intYear == currentYear ){
                                        thisYearVisits[key] = thisYearVisits[key] + stat.values[year][month][key];
                                        if (intMonth == currentMonth ){
                                            thisMonthVisits[key] = thisMonthVisits[key] + stat.values[year][month][key];
                                        } else if (intMonth == (currentMonth-1)){
                                            previousMonthVisits[key] = previousMonthVisits[key] + stat.values[year][month][key];
                                        }
                                    } else if (currentMonth == 1 && intYear == (currentYear-1) && intMonth == 12){
                                        previousMonthVisits[key] = previousMonthVisits[key] + stat.values[year][month][key];
                                    }
                                }
                            });
                        }
                    }
                }
            }
            stat.currentYear = {}
            stat.currentMonth = {}
            stat.previousMonth = {}
            Object.keys(keys).forEach((key)=>{
                stat[keys[key]] = totalVisits[key];
                stat.currentYear[keys[key]] = thisYearVisits[key];
                stat.currentMonth[keys[key]] = thisMonthVisits[key];
                stat.previousMonth[keys[key]] = previousMonthVisits[key];
            });
            return stat;
        },
        updateTypes: function(){
            let app = this;
            if (!app.entriesUpdated || !app.pagesUpdated){
                return ;
            }
            Object.keys(app.stats).forEach((key)=>{
                let tag = app.stats[key].resource
                if (app.entries.hasOwnProperty(tag)){
                    app.stats[key].type = `entry ${app.entries[tag].formId}`;
                    if (!app.types.hasOwnProperty(app.stats[key].type)){
                        app.typesEmpty = true;
                        app.types[app.stats[key].type] = _t('STATS_ENTRY',{formId:app.entries[tag].formId});
                        app.formTypes[app.types[app.stats[key].type]] = app.types[app.stats[key].type];
                        app.typesEmpty = false;
                    }
                } else if (app.pages.includes(tag)){
                    app.stats[key].type = "page";
                    if (!app.types.hasOwnProperty('page')){
                        app.typesEmpty = true;
                        app.types.page = _t('STATS_PAGE');
                        app.formTypes[_t('STATS_PAGE')] = _t('STATS_PAGE');
                        app.typesEmpty = false;
                    }
                } else if (tag.slice(0,5) == "Liste"){
                    // app.stats[key].type = "list";
                    // app.pages.push(tag);
                    // if (!app.types.hasOwnProperty('list')){
                    //     app.typesEmpty = true;
                    //     app.types.list = _t('STATS_LIST');
                    //     app.formTypes[_t('STATS_LIST')] = _t('STATS_LIST');
                    //     app.typesEmpty = false;
                    // }
                } else if (!app.statsToDelete.includes(tag)){
                    app.statsToDelete.push(tag);
                }
            });
            
            app.dataTable.rows().eq(0).each(function( rowIdx ){
                    let tag = app.dataTable.cell(rowIdx,0).data();
                    let statKey = Object.keys(app.stats).filter((key)=>app.stats[key].resource == tag)
                    if (statKey.length == 1){
                        let selectKey = statKey.shift()
                        let type = app.stats[selectKey].type;
                        app.dataTable.cell(rowIdx,9).data(type);
                    }
                }
            )

            app.updateTypesLabels();
            app.deleteStats();
        },
        updateTypesLabels: function(){
            for (const key in this.types) {
                if (key.slice(0,5) == "entry"){
                    let formId = key.slice(6);
                    this.updateTypeLabel(key,formId);
                }
            }
        },
        updateTypeLabel: function(key,formId){
            $.ajax({
                method: "GET",
                url: wiki.url(`api/forms/${formId}`),
                success: (data)=>{
                    if (typeof data == "object" && 
                    data.hasOwnProperty("bn_label_nature") && 
                    data.hasOwnProperty("bn_id_nature") && 
                    data["bn_id_nature"] == formId){
                        this.typesEmpty = true;
                        this.formTypes[this.types[key]] = _t('STATS_FORM',{formName:data["bn_label_nature"],formId:data["bn_id_nature"]});
                        this.typesEmpty = false;
                    }
                }
            });
        },
        deleteStats: function(){
            if (this.statsToDelete.length > 0){
                let currentStatsToDelete = [...this.statsToDelete];
                let tagsToDelete = [];
                this.getOneStatToDelete(currentStatsToDelete,tagsToDelete);
            }
        },
        getOneStatToDelete: function(currentStatsToDelete,tagsToDelete){
            if (currentStatsToDelete.length == 0){
                return this.deleteStatsNext(tagsToDelete);
            }
            let app = this;
            let currentTag = currentStatsToDelete.shift();
            $.ajax({
                method: "GET",
                url: wiki.url(`api/triples/${currentTag}`),
                data: {
                    property: 'https://yeswiki.net/vocabulary/stats',
                },
                success: function(data){
                    let dataAsArray = app.dataToArray(data);
                    if (dataAsArray.length > 0){
                        app.getOneTagToDelete(currentTag,currentStatsToDelete,tagsToDelete);
                    } else {
                        console.log({nostatFor:currentTag,dataAsArray})
                        app.getOneStatToDelete(currentStatsToDelete,tagsToDelete);
                    }
                },
                error: function(xhr,status,error){
                    console.log({errorGetStatFor:currentTag,error})
                    app.getOneStatToDelete(currentStatsToDelete,tagsToDelete);
                }
            });
        },
        getOneTagToDelete: function(tag,currentStatsToDelete,tagsToDelete){
            let app = this;
            $.ajax({
                method: "GET",
                url: wiki.url(`api/pages/${tag}`),
                success: function(data){
                    if (typeof data === "object" && Object.keys(data).length > 0){
                        if (data.hasOwnProperty('id') && data.tag == tag){
                            // existing page
                            console.log({existingPage:tag,data});
                        } else {
                            // error
                            console.log({weirdTagForPage:tag,data})
                        }
                        app.getOneStatToDelete(currentStatsToDelete,tagsToDelete);
                    } else {
                        // pages not existing
                        if (!tagsToDelete.includes(tag)){
                            tagsToDelete.push(tag);
                        }
                        app.getOneStatToDelete(currentStatsToDelete,tagsToDelete);
                    }
                },
                error: function(xhr,status,error){
                    // pages not existing
                    if (!tagsToDelete.includes(tag)){
                        tagsToDelete.push(tag);
                    }
                    app.getOneStatToDelete(currentStatsToDelete,tagsToDelete);
                }
            });
        },
        deleteStatsNext: function (tagsToDelete){
            // console.log({deleting:tagsToDelete});
            this.deleteAStat(tagsToDelete);
        },
        deleteAStat: function (next){
            if (next.length == 0){
                // location.reload();
                return;
            }
            let tag = next.shift();
            if (tag.length == 0){
                this.deleteAStat(next);
                return false;
            }
            let app = this;
            $.ajax({
                method: "POST",
                url: wiki.url(`api/triples/${tag}/delete`),
                data: {
                    property: 'https://yeswiki.net/vocabulary/stats',
                    filters: {
                        0: "",
                    }
                },
                success: function(data){
                    console.log({deleted:tag,next});
                },
                complete: function(){
                  app.deleteAStat(next);
                }
            });
        },
        removeLines: function (selectedTags){
            let idxToRemove = [];
            this.dataTable.rows().eq(0).each(( rowIdx )=>{
                let tag = this.dataTable.cell(rowIdx,0).data();
                if (selectedTags.includes(tag)){
                    idxToRemove.push(rowIdx);
                }
            });
            idxToRemove.forEach((rowIdx)=>{this.dataTable.row(rowIdx).remove().draw()});
        }
    },
    mounted(){
        $(isVueJS3 ? this.$el.parentNode : this.$el).on('dblclick',function(e) {
          return false;
        });
        document.addEventListener('DOMContentLoaded', () => {
            this.dOMContentLoaded = true;
        });
        this.loadStats();
    },
    watch: {
        currentType: function(newVal){
            this.dataTable.column(9).search(newVal).draw();
        }
    }
};

if (isVueJS3){
    let app = Vue.createApp(appParams);
    app.config.globalProperties.wiki = wiki;
    app.config.globalProperties._t = _t;
    rootsElements.forEach(elem => {
        app.mount(elem);
    });
} else {
    Vue.prototype.wiki = wiki;
    Vue.prototype._t = _t;
    rootsElements.forEach(elem => {
        new Vue({
            ...{el:elem},
            ...appParams
        });
    });
}