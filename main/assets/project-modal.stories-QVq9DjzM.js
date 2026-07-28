import{aX as n,ay as R}from"./iframe-DAMAKIsi.js";import{c as N,q as B,k as x,p as j}from"./fixtures-BZzR_DAR.js";import{C as P}from"./confirm-dialog-E9atywT2.js";import{P as H}from"./project-modal-DAucMBqt.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DWtX9coI.js";import"./Select-ef7c0426.esm-B5a6i_ou.js";import"./chevron-down-BGyHDD1X.js";import"./check-Cm8tIL1C.js";import"./index-Cwaii1aI.js";import"./triangle-alert-CR7Lln8a.js";import"./export-menu-kFDBozJN.js";import"./client-Cbfujt0F.js";import"./markdown-preview-F8AfRfIT.js";import"./index.dom-D_wTd2ti.js";import"./file-text-ZhT4vSKk.js";import"./copy-B-1qXURk.js";import"./file-code-corner-CUI2KrKn.js";import"./loader-circle-WInSQoxi.js";import"./api-Cf3xAxtZ.js";import"./folder-open-BhnkteeT.js";import"./folder-Neh0D3yc.js";import"./tag-color-picker-CMFYWFQ0.js";import"./project-tag-COcFMR3_.js";import"./sparkles-Cqmre-0c.js";import"./brain-D2jifDvi.js";import"./chevron-right-BUzG93L0.js";import"./markdown-editor-BYD0gJcl.js";import"./pencil-CfIEUEf5.js";import"./trash-2-DzIhcYGU.js";import"./templates-BS-RP0_S.js";import"./plus-D85K9vaG.js";import"./task-row-CBiNpoiY.js";import"./i18n-labels-Cx6pD8Ae.js";import"./selectable-icon-B5DkYWc4.js";import"./hover-expand-button-BX6to5AD.js";import"./index-4VMWshsF.js";import"./data-refresh-CpTj2Jd0.js";import"./rotate-ccw-Cj8Capa4.js";import"./play-CmVEwy0f.js";import"./square-terminal-CJkW7rnp.js";import"./task-columns-BUR8DOSo.js";var s,c,p,l,m,d,v,u,_,w,g,y,T,E,b;const{expect:f,fn:h,userEvent:C,within:t}=__STORYBOOK_MODULE_TEST__,ja={title:"Components/ProjectModal",component:H,args:{onClose:h(),onSaved:h()},decorators:[a=>n.jsx(R,{children:n.jsx(P,{children:n.jsx(a,{})})})]},o={args:{project:null},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"New project"});await f(t(e).getByLabelText("Title")).toHaveValue("")}},i={args:{project:j,tasks:[B,x],memories:[N],onSelectTask:h()},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"});await f(t(e).getByLabelText("Title")).toHaveValue(j.name)}},r={args:{project:j,tasks:[B,x]},play:async({canvasElement:a})=>{const e=await t(a).findByRole("dialog",{name:"Edit project"}),S=t(e).getByRole("tab",{name:/plan/i});await C.click(S),await f(S).toHaveAttribute("aria-selected","true")}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.source},description:{story:"Creating a project — empty form under the Details tab.",...(m=o.parameters)===null||m===void 0||(l=m.docs)===null||l===void 0?void 0:l.description}}};i.parameters={...i.parameters,docs:{...(d=i.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
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
}`,...(T=r.parameters)===null||T===void 0||(y=T.docs)===null||y===void 0?void 0:y.source},description:{story:"The tablist switches sections; selecting Plan marks that tab selected.",...(b=r.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};const ha=["New","Edit","SwitchTab"];export{i as Edit,o as New,r as SwitchTab,ha as __namedExportsOrder,ja as default};
