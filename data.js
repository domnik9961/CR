// Dane konfiguracyjne aplikacji
const TABS = [
  {id:'t1',name:'Informacje ogólne',required:['rName','rTitle','rDesc'],completionCheck:'required'},
  {id:'t2',name:'Źródło SQL',required:['sqlType'],completionCheck:'required'},
  {id:'t3',name:'Kolumny',required:[],completionCheck:'columns'},
  {id:'t4',name:'Parametry',required:[],completionCheck:'params'},
  {id:'t5',name:'Filtry',required:[],completionCheck:'filters'},
  {id:'t6',name:'Grupowanie',required:[],completionCheck:'groups'},
  {id:'t7',name:'Podraporty',required:[],completionCheck:'subreports'},
  {id:'t8',name:'Nagłówki/Stopki',required:['rhTitle'],completionCheck:'required'},
  {id:'t9',name:'Brak danych',required:['emptyMsg'],completionCheck:'required'},
  {id:'t10',name:'Opcje wyjścia',required:[],completionCheck:'exports'},
];

const STEP_NAMES = TABS.map(t=>t.name);

const HM_HINTS = {
  static:'Statyczny nagłówek to stały tekst w CR Designer — nie zmienia się w runtime.',
  param:'Nagłówek pobierany z parametru CR ({?X}) — można zmienić z C# przed generowaniem.',
  formula:'Nagłówek generowany przez CR Formula ({@X}) — może zależeć od parametrów, języka, dat.',
  mixed:'Każda kolumna ma własny tryb nagłówka — konfigurowane indywidualnie per wiersz.'
};

const COMPLETION_CHECKS = {
  required: completionFromRequired,
  columns: (tab, pane)=> completionFromStructure({
    ready: document.getElementById('colBody').rows.length >= 1,
    touched: countFilledInputs(pane) > 0
  }),
  params: (tab, pane)=> completionFromStructure({
    ready: document.getElementById('paramBody').rows.length >= 1,
    touched: countFilledInputs(pane) > 0
  }),
  filters: (tab, pane)=> {
    const groups = document.querySelectorAll('#filterGroups .cond-group').length;
    const filledFilterValues = Array.from(document.querySelectorAll('#filterGroups .filter-rows input[type=text]')).filter(el=>(el.value||'').trim().length>0).length;
    return completionFromStructure({
      ready: groups >= 1 && filledFilterValues >= 1,
      touched: countFilledInputs(pane) > 0 || groups > 0
    });
  },
  groups: (tab, pane)=> completionFromStructure({
    ready: document.getElementById('groupBody').rows.length >= 1,
    touched: countFilledInputs(pane) > 0
  }),
  subreports: (tab, pane)=> completionFromStructure({
    ready: document.querySelectorAll('.sr-card').length >= 1,
    touched: countFilledInputs(pane) > 0
  }),
  exports: (tab, pane)=> completionFromStructure({
    ready: document.querySelectorAll('.fmt-cb:checked').length >= 1,
    touched: countFilledInputs(pane) > 0
  })
};

const VALIDATION_CONFIG = [
  {id:'rName', tab:'t1', label:'Nazwa raportu'},
  {id:'rTitle', tab:'t1', label:'Tytuł wyświetlany'},
  {id:'rDesc', tab:'t1', label:'Opis / cel raportu'},
  {id:'sqlType', tab:'t2', label:'Typ źródła SQL'},
  {id:'defaultExportFormat', tab:'t10', label:'Domyślny format eksportu'}
];

window.APP_DATA = {
  TABS,
  STEP_NAMES,
  HM_HINTS,
  COMPLETION_CHECKS,
  VALIDATION_CONFIG
};
