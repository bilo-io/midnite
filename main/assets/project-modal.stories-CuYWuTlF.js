import{aX as n,ax as R}from"./iframe-B0E9638w.js";import{c as N,q as x,k as B,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-TyptWHN8.js";import{P as H}from"./project-modal-CaOcptye.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Bv27s9eg.js";import"./Select-ef7c0426.esm-Gg0ser_s.js";import"./chevron-down-Cogw_DS7.js";import"./check-H-Y7sFPy.js";import"./index-DoiGhrhv.js";import"./triangle-alert-3wfMb6gu.js";import"./export-menu-CkSqliYy.js";import"./client-ChTwrvJU.js";import"./markdown-preview-BHIdrKKl.js";import"./index.dom-D_wTd2ti.js";import"./file-text-C-ZxX5lX.js";import"./copy-By0ZLYI2.js";import"./file-code-corner-BfcTvc8t.js";import"./loader-circle-Ds8cDbYd.js";import"./api-PQjXbBA6.js";import"./folder-open-CH7K4vDu.js";import"./folder-BhWZfr8L.js";import"./tag-color-picker-DLQ0ESVP.js";import"./project-tag-j--98bB8.js";import"./sparkles-j1TVJfas.js";import"./brain-CpAfsuTP.js";import"./chevron-right-kU_5A1Zw.js";import"./markdown-editor-a4HEgOND.js";import"./pencil-CmbZLT0d.js";import"./trash-2-BmFmshqc.js";import"./templates-B6M1OYb3.js";import"./plus-DzB4Nw_1.js";import"./task-row-CGHkRiCh.js";import"./blocked-badge-DwDQPdah.js";import"./selectable-icon-CYcoiR3U.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-Bbg93rs6.js";import"./arrow-left-Bl3q63tt.js";var s,c,p,l,d,m,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ya={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[x,B],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[x,B]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  args: {
    project: null
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'New project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue('');
  }
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(d=o.parameters)===null||d===void 0||(l=d.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(m=i.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug],
    memories: [memoryProjectScoped],
    onSelectTask: fn()
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    await expect(within(dialog).getByLabelText('Title')).toHaveValue(project.name);
  }
}`,...(u=i.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.source},description:{story:"Editing a project — fields pre-filled, with tasks + a scoped memory surfaced.",...(w=i.parameters)===null||w===void 0||(_=w.docs)===null||_===void 0?void 0:_.description}}};r.parameters={...r.parameters,docs:{...(g=r.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    project,
    tasks: [taskFeature, taskBug]
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const dialog = await canvas.findByRole('dialog', {
      name: 'Edit project'
    });
    const planTab = within(dialog).getByRole('tab', {
      name: /plan/i
    });
    await userEvent.click(planTab);
    await expect(planTab).toHaveAttribute('aria-selected', 'true');
  }
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const Ta=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,Ta as __namedExportsOrder,ya as default};
